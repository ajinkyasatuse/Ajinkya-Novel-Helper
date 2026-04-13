
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Character, Event, Lore, WorldEntityType, ConsistencyIssue, PlotTwist, NovelType, Region, Item, Clan, Creature, MagicalThing, Dialog } from "../types";

// Available Models
export const AI_MODELS = {
    FAST: 'gemini-3-flash-preview',
    SMART: 'gemini-3-flash-preview',
    IMAGE: 'gemini-2.5-flash-image'
};

const getAI = (apiKeyOverride?: string) => {
  // 1. Priority: Immediate Override (e.g. from Import Modal)
  let apiKey = apiKeyOverride;
  
  // 2. Secondary: User Settings (LocalStorage) - specific for deployed instances
  if (!apiKey || !apiKey.trim()) {
      apiKey = localStorage.getItem('ajinkya_gemini_api_key') || '';
  }

  // 3. Fallback: Environment Variable (Build time)
  if (!apiKey || !apiKey.trim()) {
      apiKey = process.env.API_KEY || '';
  }

  // Sanitize
  if (apiKey) apiKey = apiKey.replace(/^"|"$/g, '').trim();

  // Validate
  if (!apiKey || apiKey.length < 10) {
    console.error("API Key Check Failed: Key is missing or invalid.");
    throw new Error("Valid API Key is missing. Please configure it in Settings or the Import menu.");
  }
  
  return new GoogleGenAI({ apiKey });
};

// Robust JSON Extractor
const cleanJson = (text: string): string => {
    if (!text) return "{}";
    
    // 1. Remove markdown code blocks
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 2. Attempt direct parse
    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch (e) {
        // Continue to extraction logic
    }

    // 3. Extract JSON structure by finding outer braces
    const firstOpenBrace = cleaned.indexOf('{');
    const firstOpenBracket = cleaned.indexOf('[');

    if (firstOpenBrace === -1 && firstOpenBracket === -1) return "{}";

    let startIndex = -1;
    let isArray = false;

    // Determine if we are looking for an object or array based on which comes first
    if (firstOpenBracket !== -1 && (firstOpenBrace === -1 || firstOpenBracket < firstOpenBrace)) {
        startIndex = firstOpenBracket;
        isArray = true;
    } else {
        startIndex = firstOpenBrace;
    }

    let balance = 0;
    let endIndex = -1;

    for (let i = startIndex; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (char === '{' || char === '[') {
            balance++;
        } else if (char === '}' || char === ']') {
            balance--;
        }

        if (balance === 0) {
            endIndex = i;
            break;
        }
    }

    if (startIndex !== -1 && endIndex !== -1) {
        return cleaned.substring(startIndex, endIndex + 1);
    }

    return "{}";
}

type WorldData = {
    characters?: Character[];
    regions?: Region[];
    lores?: Lore[];
    events?: Event[];
    items?: Item[];
    clans?: Clan[];
    creatures?: Creature[];
    magicalThings?: MagicalThing[];
    dialogs?: Dialog[];
    [key: string]: any;
}

export type EnhanceStyle = 'improve' | 'action' | 'peaceful' | 'dialogue';

export const analyzeChapterTension = async (content: string, model: string = AI_MODELS.FAST): Promise<{ tension: number; sentiment: number }> => {
    try {
        const ai = getAI();
        const prompt = `Analyze the following chapter text. 
        1. Determine the "Tension Score" on a scale of 1 to 10 (1=Boring/Calm, 10=Climax/Extreme Suspense).
        2. Determine the "Sentiment Score" on a scale of -1 to 1 (-1=Tragic/Negative, 1=Joyful/Positive, 0=Neutral).
        Return JSON ONLY: {"tension": number, "sentiment": number}.
        
        Text: ${content.substring(0, 15000)}`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const jsonText = cleanJson(response.text || "");
        return jsonText ? JSON.parse(jsonText) : { tension: 0, sentiment: 0 };
    } catch (error) {
        console.error("Error analyzing tension:", error);
        return { tension: 0, sentiment: 0 };
    }
}

const formatContext = (worldData: WorldData): string => {
    let context = "WORLD BIBLE CONTEXT:\n";
    if (!worldData) return context;

    if (worldData.characters && worldData.characters.length > 0) {
        context += "\n-- CHARACTERS (Name | Role | Description | Goal | Conflict) --\n";
        worldData.characters.forEach(c => {
            const details = [
                c.role ? `Role: ${c.role}` : '',
                c.description ? `Desc: ${c.description.substring(0, 150)}` : '',
                c.goal ? `Goal: ${c.goal}` : '',
                c.conflict ? `Conflict: ${c.conflict}` : ''
            ].filter(Boolean).join('. ');
            context += `[${c.name.toUpperCase()}]: ${details}\n`;
        });
    }
    
    if (worldData.regions && worldData.regions.length > 0) {
        context += "\n-- LOCATIONS (Name | Description) --\n";
        worldData.regions.forEach(r => {
             context += `[${r.name.toUpperCase()}]: ${r.description?.substring(0, 150) || ''}\n`;
        });
    }

    const otherKeys = ['lores', 'events', 'items', 'clans', 'creatures', 'magicalThings', 'dialogs', 'customEntities'];
    otherKeys.forEach(key => {
        if (worldData[key] && Array.isArray(worldData[key]) && worldData[key].length > 0) {
            context += `\n-- ${key.toUpperCase()} --\n`;
            worldData[key].forEach((i: any) => {
                const name = i.name || (i as Dialog).content?.substring(0, 20) || 'Untitled';
                context += `[${name}]: ${i.description || (i as Dialog).context || ''}\n`;
            });
        }
    });
    
    return context;
};

export const checkConsistency = async (text: string, worldData: WorldData, model: string = AI_MODELS.SMART): Promise<ConsistencyIssue[]> => {
  try {
    const ai = getAI();
    const prompt = `You are an expert novel editor.
    
${formatContext(worldData)}

TEXT TO CHECK:
---
${text.substring(0, 30000)}
---

TASK: Identify inconsistencies between the TEXT and the WORLD BIBLE.
Return JSON array of objects: { problematicText, issue, suggestions: [] }.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const jsonText = cleanJson(response.text || "");
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    console.error("Error in checkConsistency:", error);
    throw new Error(error.message || "Consistency check failed");
  }
};

export const analyzePacing = async (chapterContent: string, type: NovelType = 'novel', model: string = AI_MODELS.SMART): Promise<string> => {
  try {
    const ai = getAI();
    const prompt = `Analyze pacing/tone. 3-5 bullet points. Markdown. Content: ${chapterContent.substring(0, 25000)}`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "No analysis generated.";
  } catch (error: any) {
    console.error("Error in analyzePacing:", error);
    throw new Error(error.message || "Failed to get analysis.");
  }
};

export const generateOutline = async (logline: string, genre: string, type: NovelType = 'novel', model: string = AI_MODELS.SMART): Promise<{ title: string; summary: string }[]> => {
    try {
        const ai = getAI();
        const prompt = `Generate a ${type === 'script' ? 'beat sheet' : '15-chapter outline'} for '${genre}'. Logline: '${logline}'. JSON array: [{ "title": "...", "summary": "..." }].`;
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" },
        });
        const jsonText = cleanJson(response.text || "");
        return JSON.parse(jsonText);
    } catch (error: any) {
        console.error("Error in generateOutline:", error);
        throw new Error(error.message || "Failed to generate outline.");
    }
};

export const generateCharacter = async (prompt: string, existingCharacterNames: string[], model: string = AI_MODELS.FAST): Promise<Omit<Character, 'id' | 'novelId'>> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: model,
            contents: `Generate character based on: "${prompt}". Exclude: ${existingCharacterNames.join(', ')}. JSON: { name, description, race, gender, birthplace, powers, ability, skills, occupation, achievements, connections: [{ targetName, type }] }.`,
            config: { responseMimeType: "application/json" },
        });
        const jsonText = cleanJson(response.text || "");
        return JSON.parse(jsonText);
    } catch (error: any) {
        console.error("Error in generateCharacter:", error);
        throw new Error(error.message || "Failed to generate character.");
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: AI_MODELS.IMAGE,
          contents: { parts: [{ text: prompt }] },
          config: { responseModalities: [Modality.IMAGE] },
        });
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        throw new Error("No image data found.");
    } catch (error: any) {
        console.error("Error in generateImage:", error);
        throw new Error(error.message || "Failed to generate image.");
    }
};

export const analyzePdfForWorldBuilding = async (text: string, apiKey?: string, model: string = AI_MODELS.SMART): Promise<{ 
    characters: Omit<Character, 'id' | 'novelId'>[], 
    events: Omit<Event, 'id' | 'novelId'>[], 
    lores: Omit<Lore, 'id' | 'novelId'>[],
    regions: Omit<Region, 'id' | 'novelId'>[],
    items: Omit<Item, 'id' | 'novelId'>[],
    clans: Omit<Clan, 'id' | 'novelId'>[],
    dialogs: Omit<Dialog, 'id' | 'novelId'>[]
}> => {
  try {
      const ai = getAI(apiKey);
      const prompt = `You are a World-Building Expert. Extract a COMPREHENSIVE World Bible from this text.
      
      Extract with HIGH DETAIL into a JSON Object:
      {
        "characters": [{ "name": "...", "description": "...", "race": "...", "group": "..." }],
        "regions": [{ "name": "...", "description": "...", "location": "..." }],
        "items": [{ "name": "...", "description": "..." }],
        "clans": [{ "name": "...", "description": "..." }],
        "events": [{ "name": "...", "description": "..." }],
        "lores": [{ "name": "...", "description": "..." }],
        "dialogs": [{ "content": "Quote text", "speakerName": "Name", "context": "When/Why" }]
      }

      Text Excerpt:
      ${text.substring(0, 150000)}`;

      const response = await ai.models.generateContent({
        model: model, 
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const jsonText = cleanJson(response.text || "");
      const parsed = jsonText ? JSON.parse(jsonText) : {};
      
      return { 
          characters: parsed.characters || [], 
          events: parsed.events || [], 
          lores: parsed.lores || [],
          regions: parsed.regions || [],
          items: parsed.items || [],
          clans: parsed.clans || [],
          dialogs: parsed.dialogs || []
      };
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze text. Please check your API Key.");
  }
};

export const checkGrammar = async (text: string, model: string = AI_MODELS.FAST): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: model,
      contents: `Correct grammar/spelling. Return ONLY corrected text. Text: ${text}`,
    });
    return response.text || text;
  } catch (error) { return text; }
};

export const enhanceWriting = async (text: string, style: EnhanceStyle, model: string = AI_MODELS.SMART): Promise<string> => {
  if (!text.trim()) return text;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: model,
      contents: `Rewrite to be ${style}. Return ONLY rewritten text. Text: ${text}`,
    });
    return response.text || text;
  } catch (error) { return text; }
};

export const suggestPlotTwists = async (chapterContent: string, novelLogline: string, novelGenre: string, model: string = AI_MODELS.SMART): Promise<PlotTwist[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: model,
      contents: `Suggest 3 plot twists for '${novelGenre}'. Logline: "${novelLogline}". Draft: ${chapterContent.substring(0, 10000)}. JSON array: { title, description }.`,
      config: { responseMimeType: "application/json" }
    });
    const jsonText = cleanJson(response.text || "");
    return jsonText ? JSON.parse(jsonText) : [];
  } catch (error) { return []; }
};

export const generateImagePrompt = async (name: string, type: string, description: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: AI_MODELS.FAST,
      contents: `Create image prompt for ${type} named ${name}. Description: ${description}. Return prompt only.`,
    });
    return response.text || "";
  } catch (error) { return ""; }
};

export const generateGhostText = async (currentText: string, novelType: NovelType, worldData: WorldData = {}, model: string = AI_MODELS.FAST): Promise<string> => {
    try {
        const ai = getAI();
        let prompt = `Continue the story (1-3 sentences). ${novelType === 'script' ? 'Screenplay format' : 'Prose'}.`;
        
        // Add World Context if available
        const context = formatContext(worldData);
        if (context.length > 20) {
            prompt += `\n\n${context}\n`;
        }

        prompt += `\nSTORY CONTEXT:\n${currentText.slice(-5000)}`;
        
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text?.trim() || "";
    } catch (error) { return ""; }
}

export const generateNextEvents = async (currentText: string, worldData: WorldData, model: string = AI_MODELS.SMART): Promise<{ event: string, reason: string }[]> => {
    try {
        const ai = getAI();
        let prompt = `Suggest 3 logical next events for the story. Return JSON array: [{ "event": "...", "reason": "..." }].`;
        
        const context = formatContext(worldData);
        if (context.length > 20) {
            prompt += `\n\n${context}\n`;
        }
        
        prompt += `\nCURRENT STORY:\n${currentText.slice(-5000)}`;

        const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const jsonText = cleanJson(response.text || "");
        return jsonText ? JSON.parse(jsonText) : [];
    } catch (error: any) { 
        console.error("Generate Next Events Error", error);
        throw new Error(error.message || "Failed to generate events");
    }
}

export const generateWorldRecommendations = async (currentText: string, worldData: WorldData, model: string = AI_MODELS.SMART): Promise<{ type: string, suggestion: string, reason: string }[]> => {
    try {
        const ai = getAI();
        let prompt = `Analyze the current chapter content and the provided World Bible. Suggest how to better integrate world-building elements into this scene.
        
        Suggest 4 specific recommendations. These could be:
        - Characters who have a reason to be here or be mentioned.
        - Locations or sensory details from the region that could be added.
        - Lore or history that adds depth to the current dialogue or action.
        - Conflicts based on character goals/conflicts that could be heightened.
        
        Return a JSON array of objects: [{ "type": "Character|Location|Lore|Conflict", "suggestion": "...", "reason": "..." }].`;
        
        const context = formatContext(worldData);
        if (context.length > 20) {
            prompt += `\n\nWORLD BIBLE:\n${context}\n`;
        }
        
        prompt += `\nCURRENT CONTENT:\n${currentText.slice(-8000)}`;

        const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const jsonText = cleanJson(response.text || "");
        return jsonText ? JSON.parse(jsonText) : [];
    } catch (error: any) { 
        console.error("Generate Recommendations Error", error);
        throw new Error(error.message || "Failed to generate recommendations");
    }
}

export const analyzeScript = async (scriptContent: string, model: string = AI_MODELS.SMART): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ model, contents: `Analyze script for formatting, dialogue, and pacing issues. Provide constructive feedback in Markdown. Script: ${scriptContent.substring(0, 20000)}` });
        return response.text || "Analysis failed.";
    } catch (error) { return "Failed."; }
};

export const convertProseToScript = async (proseText: string, worldData: WorldData = {}, model: string = AI_MODELS.SMART): Promise<string> => {
    try {
        const ai = getAI();
        let prompt = `Convert the following prose to standard Screenplay HTML format.
        Use these CSS classes: 'scene-heading' (sluglines), 'action' (description), 'character' (names), 'dialogue' (speech), 'parenthetical' (wrylies), 'transition'.
        
        IMPORTANT: Use the provided World Bible to correctly identify Character Names and Locations.`;

        const context = formatContext(worldData);
        if (context.length > 20) {
            prompt += `\n\n${context}\n`;
        }

        prompt += `\nSOURCE PROSE:\n${proseText.substring(0, 15000)}`;

        const response = await ai.models.generateContent({ model, contents: prompt });
        let cleanHtml = response.text?.trim() || "";
        cleanHtml = cleanHtml.replace(/^```html\s*/, '').replace(/```$/, '');
        return cleanHtml;
    } catch (error) { return ""; }
};

export const splitTextIntoChapters = async (text: string, model: string = AI_MODELS.SMART): Promise<{ title: string, content: string }[]> => {
    try {
        const ai = getAI();
        const prompt = `Analyze the following manuscript text and split it into logical chapters. 
        For each chapter, provide a title and the full text content of that chapter.
        
        Return a JSON array of objects: [{ "title": "...", "content": "..." }].
        
        TEXT:
        ${text.substring(0, 30000)}`; // Limit to 30k chars for now

        const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        const jsonText = cleanJson(response.text || "");
        return jsonText ? JSON.parse(jsonText) : [];
    } catch (error) {
        console.error("Split Chapters Error", error);
        return [];
    }
};

export const generateContextAwareSuggestions = async (
    currentText: string, 
    worldData: WorldData, 
    type: 'continue' | 'describe' | 'twist' | 'dialogue',
    model: string = AI_MODELS.SMART
): Promise<string> => {
    try {
        const ai = getAI();
        let prompt = "";
        const context = formatContext(worldData);

        switch (type) {
            case 'continue':
                prompt = `Continue the story naturally from the last paragraph. Write about 200-300 words. Maintain the tone.`;
                break;
            case 'describe':
                prompt = `Identify the current setting or focused character in the last paragraph and provide a vivid, sensory-rich description based on the World Bible.`;
                break;
            case 'twist':
                prompt = `Suggest a sudden plot twist or revelation that could happen right now based on the current context and World Bible.`;
                break;
            case 'dialogue':
                prompt = `Write a dialogue exchange relevant to the current scene. Ensure character voices match their descriptions in the World Bible.`;
                break;
        }

        if (context.length > 20) prompt += `\n\n${context}\n`;
        prompt += `\nCURRENT TEXT:\n${currentText.slice(-5000)}`;

        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text || "";
    } catch (error) { return ""; }
};

export const smartFormatScript = async (text: string, worldData: WorldData = {}): Promise<string> => {
    return convertProseToScript(text, worldData, AI_MODELS.SMART);
}

export const analyzeDialogue = async (
    charA: Character, 
    charB: Character, 
    dialogueSnippet: string, 
    model: string = AI_MODELS.SMART
): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `
            Analyze the following dialogue between ${charA.name} and ${charB.name}.
            
            CHARACTER A: ${charA.name} (${charA.role}, ${charA.description})
            CHARACTER B: ${charB.name} (${charB.role}, ${charB.description})
            
            DIALOGUE:
            "${dialogueSnippet}"
            
            TASK:
            1. Identify the "Linguistic Fingerprint" of each character. Do they sound distinct?
            2. Suggest specific rewrites to make their voices more unique based on their bio.
            3. Highlight any generic lines that could belong to anyone.
            
            Return the analysis in Markdown format.
        `;
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt
        });

        return response.text || "Analysis failed.";
    } catch (error) {
        console.error("Dialogue Analysis Error", error);
        return "Failed to analyze dialogue.";
    }
};

export const generateTimelineRecommendations = async (
    currentChapterText: string, 
    worldData: WorldData, 
    timelineArcs: any[], // Using any for now to avoid circular dependency, ideally StoryArc[]
    model: string = AI_MODELS.SMART
): Promise<{ title: string, description: string, reasoning: string }[]> => {
    try {
        const ai = getAI();
        let prompt = `Analyze the current story context and the provided Timeline Arcs. Suggest 3 "What Happens Next" scenarios that advance the active plot threads.
        
        TIMELINE ARCS:
        ${JSON.stringify(timelineArcs)}

        CURRENT CHAPTER TEXT:
        ${currentChapterText.slice(-5000)}

        WORLD CONTEXT:
        ${formatContext(worldData)}

        Return a JSON array of objects: [{ "title": "...", "description": "...", "reasoning": "..." }].`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const jsonText = cleanJson(response.text || "");
        return jsonText ? JSON.parse(jsonText) : [];
    } catch (error: any) {
        console.error("Timeline Recommendations Error", error);
        return [];
    }
};

// --- ULTIMATE ASSISTANT CONTROLLER ---

export type AppAction = 
    | { action: 'create', type: string, data: any }
    | { action: 'update', type: string, id: string, data: any }
    | { action: 'delete', type: string, id: string };

export const generateAppActions = async (
    userPrompt: string, 
    worldData: WorldData, 
    novelStructure: { id: string, title: string, books: { id: string, title: string, chapters: { id: string, title: string }[] }[] },
    model: string = AI_MODELS.SMART
): Promise<{ actions: AppAction[], explanation: string }> => {
    try {
        const ai = getAI();
        
        let context = `Current Novel Structure: ${JSON.stringify(novelStructure)}\n`;
        context += formatContext(worldData);

        const prompt = `You are the Ultimate AI Controller for a Novel Writing App.
        CONTEXT: ${context}
        USER REQUEST: "${userPrompt}"
        INSTRUCTIONS: Analyze request. Return actions to Create/Update/Delete entities.
        OUTPUT FORMAT (JSON): { "explanation": "string", "actions": [{ "action": "create"|"update"|"delete", "type": "string", "id"?: "string", "data"?: object }] }`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const jsonText = cleanJson(response.text || "");
        return jsonText ? JSON.parse(jsonText) : { actions: [], explanation: "Failed to parse actions." };

    } catch (error: any) {
        console.error("Controller Error:", error);
        throw new Error(error.message || "AI Controller failed.");
    }
}

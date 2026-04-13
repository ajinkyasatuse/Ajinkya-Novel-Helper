
import React, { useState, useCallback, useMemo } from 'react';
import { Chapter, Novel, Character, Book, WorldEntityType, ConsistencyIssue, PlotTwist } from '../types';
import * as geminiService from '../services/geminiService';
import { BrainIcon, LoaderIcon, SparklesIcon, SettingsIcon, TrashIcon, PlusIcon, EditIcon } from './Icons';

type WorldData = {
    [key: string]: WorldEntityType[];
}

interface GeminiAssistantProps {
    activeChapter: Chapter | undefined;
    activeNovel: Novel | undefined;
    activeBook: Book | undefined;
    onAddChapters: (chapters: { title: string, summary: string }[]) => void;
    onAddCharacter: (character: Omit<Character, 'id' | 'novelId'>) => void;
    onExecuteAction?: (action: geminiService.AppAction) => void; // New prop for Controller
    allCharacters: Character[];
    worldData: WorldData;
}

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; isOpenDefault?: boolean }> = ({ title, children, isOpenDefault = false }) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);
    return (
        <div className="border-b border-slate-600">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-4 hover:bg-slate-700 flex justify-between items-center">
                <span className="font-semibold">{title}</span>
                <span>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="p-4 bg-primary">{children}</div>}
        </div>
    );
};

const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ activeChapter, activeNovel, activeBook, onAddChapters, onAddCharacter, onExecuteAction, allCharacters, worldData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Feature States
    const [analysis, setAnalysis] = useState('');
    const [outline, setOutline] = useState<{ title: string, summary: string }[]>([]);
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [consistencyResult, setConsistencyResult] = useState<ConsistencyIssue[] | null>(null);
    const [plotTwists, setPlotTwists] = useState<PlotTwist[] | null>(null);
    const [scriptDoctorAnalysis, setScriptDoctorAnalysis] = useState('');
    const [nextEvents, setNextEvents] = useState<{ event: string; reason: string }[]>([]);
    const [worldRecs, setWorldRecs] = useState<{ type: string; suggestion: string; reason: string }[]>([]);
    
    // Controller State
    const [controllerPrompt, setControllerPrompt] = useState('');
    const [pendingActions, setPendingActions] = useState<{ actions: geminiService.AppAction[], explanation: string } | null>(null);
    
    // Model Selection State
    const [selectedModel, setSelectedModel] = useState<string>(geminiService.AI_MODELS.SMART);

    const isScriptMode = activeNovel?.type === 'script';

    const clearError = () => setErrorMsg(null);

    const handleWorldRecommendations = useCallback(async () => {
        if (!activeChapter || !activeNovel) return;
        setIsLoading(true); setActiveTool('world-recs'); setWorldRecs([]); clearError();
        try { 
            const res = await geminiService.generateWorldRecommendations(activeChapter.content, worldData, selectedModel); 
            setWorldRecs(res); 
        } catch (error: any) { 
            setErrorMsg(error.message || "Failed to generate recommendations.");
        } finally { 
            setIsLoading(false); 
        }
    }, [activeChapter, activeNovel, worldData, selectedModel]);

    const handleAnalyzePacing = useCallback(async () => {
        if (!activeChapter) return;
        setIsLoading(true); setActiveTool('pacing'); setAnalysis(''); clearError();
        try { 
            const result = await geminiService.analyzePacing(activeChapter.content, activeNovel?.type, selectedModel); 
            setAnalysis(result); 
        } catch (error: any) { 
            setErrorMsg(error.message || "Failed to analyze pacing.");
        } finally { 
            setIsLoading(false); setActiveTool(null); 
        }
    }, [activeChapter, activeNovel?.type, selectedModel]);
    
    const handleGenerateOutline = useCallback(async () => {
        if (!activeNovel || !activeNovel.logline) { alert("Please provide a logline."); return; }
        setIsLoading(true); setActiveTool('outline'); setOutline([]); clearError();
        try { 
            const result = await geminiService.generateOutline(activeNovel.logline, activeNovel.genre, activeNovel.type, selectedModel); 
            setOutline(result); 
        } catch (error: any) { 
            setErrorMsg(error.message || "Failed to generate outline.");
        } finally { 
            setIsLoading(false); setActiveTool(null); 
        }
    }, [activeNovel, selectedModel]);

    const handleConfirmOutline = () => { if (outline.length > 0) { onAddChapters(outline); setOutline([]); } };
    
    const handleCharacterGenerator = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); if (!characterPrompt.trim() || !activeNovel) return;
        setIsLoading(true); setActiveTool('character'); clearError();
        try {
            const existing = allCharacters.map(c => c.name);
            const newChar = await geminiService.generateCharacter(characterPrompt, existing, selectedModel);
            const conns = newChar.connections.map(rel => ({ targetId: allCharacters.find(c => c.name === (rel as any).targetName)?.id || 'unknown', type: rel.type, description: rel.description })).filter(rel => rel.targetId !== 'unknown');
            onAddCharacter({ ...newChar, connections: conns });
            setCharacterPrompt('');
        } catch (error: any) { 
            setErrorMsg(error.message || "Failed to generate character.");
        } finally { 
            setIsLoading(false); setActiveTool(null); 
        }
    }, [characterPrompt, activeNovel, onAddCharacter, allCharacters, selectedModel]);

    const handleConsistencyCheck = useCallback(async () => {
        if (!activeChapter || !activeNovel) return;
        setIsLoading(true); setActiveTool('consistency'); setConsistencyResult([]); clearError();
        try { 
            const res = await geminiService.checkConsistency(activeChapter.content, worldData, selectedModel); 
            setConsistencyResult(res); 
        } catch (error: any) { 
            setErrorMsg(error.message || "Consistency check failed.");
        } finally { 
            setIsLoading(false); 
        }
    }, [activeChapter, activeNovel, worldData, selectedModel]);
    
    const handleSuggestPlotTwists = useCallback(async () => {
        if (!activeChapter || !activeNovel?.logline) return;
        setIsLoading(true); setActiveTool('plot'); setPlotTwists([]); clearError();
        try { 
            const res = await geminiService.suggestPlotTwists(activeChapter.content, activeNovel.logline, activeNovel.genre, selectedModel); 
            setPlotTwists(res); 
        } catch (error: any) { 
            setErrorMsg(error.message || "Failed to suggest twists.");
        } finally { 
            setIsLoading(false); 
        }
    }, [activeChapter, activeNovel, selectedModel]);
    
    const handleScriptDoctor = useCallback(async () => {
        if (!activeChapter) return; setIsLoading(true); setActiveTool('script-doctor'); setScriptDoctorAnalysis(''); clearError();
        try { 
            const res = await geminiService.analyzeScript(activeChapter.content, selectedModel); 
            setScriptDoctorAnalysis(res); 
        } catch (error: any) { 
            setErrorMsg(error.message || "Script analysis failed.");
        } finally { 
            setIsLoading(false); setActiveTool(null); 
        }
    }, [activeChapter, selectedModel]);

    const handleSuggestNextEvents = useCallback(async () => {
        if (!activeChapter || !activeNovel) return; setIsLoading(true); setActiveTool('next-events'); setNextEvents([]); clearError();
        try { 
            const res = await geminiService.generateNextEvents(activeChapter.content, worldData, selectedModel); 
            setNextEvents(res); 
        } catch (error: any) { 
            setErrorMsg(error.message || "Failed to suggest next events.");
        } finally { 
            setIsLoading(false); 
        }
    }, [activeChapter, activeNovel, worldData, selectedModel]);

    // --- CONTROLLER LOGIC ---
    const handleControllerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!controllerPrompt.trim() || !activeNovel) return;
        setIsLoading(true);
        setActiveTool('controller');
        setPendingActions(null);
        clearError();
        
        try {
            // Simplify novel structure for context to save tokens
            const novelStruct = {
                id: activeNovel.id,
                title: activeNovel.title,
                books: (activeNovel.books || []).map(b => ({
                    id: b.id,
                    title: b.title,
                    chapters: (b.chapters || []).map(c => ({ id: c.id, title: c.title }))
                }))
            };

            const result = await geminiService.generateAppActions(controllerPrompt, worldData, novelStruct, selectedModel);
            setPendingActions(result);
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || "Assistant failed to generate actions.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteActions = () => {
        if (pendingActions && onExecuteAction) {
            pendingActions.actions.forEach(action => onExecuteAction(action));
            setPendingActions(null);
            setControllerPrompt('');
            alert("Actions executed successfully!");
        }
    };

    const getActionIcon = (type: string) => {
        if (type === 'create') return <PlusIcon />;
        if (type === 'update') return <EditIcon />;
        if (type === 'delete') return <TrashIcon />;
        return null;
    }

    const assistantDisabled = useMemo(() => isLoading, [isLoading]);

    return (
        <div className="h-full flex flex-col bg-secondary text-text-primary overflow-y-auto">
            <h2 className="text-lg font-semibold p-4 border-b border-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-2"><BrainIcon /> Gemini Assistant</span>
            </h2>
            
            <div className="p-4 border-b border-slate-600 bg-primary/30">
                <label className="text-xs font-bold text-text-secondary uppercase mb-2 block flex items-center gap-2">
                    <SettingsIcon /> Model Preference
                </label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setSelectedModel(geminiService.AI_MODELS.SMART)}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors ${selectedModel === geminiService.AI_MODELS.SMART ? 'bg-accent/20 text-accent border-accent' : 'bg-secondary text-text-secondary border-white/10 hover:text-white'}`}
                    >
                        Pro (Smart)
                    </button>
                    <button 
                        onClick={() => setSelectedModel(geminiService.AI_MODELS.FAST)}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors ${selectedModel === geminiService.AI_MODELS.FAST ? 'bg-accent/20 text-accent border-accent' : 'bg-secondary text-text-secondary border-white/10 hover:text-white'}`}
                    >
                        Flash (Fast)
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400 flex justify-between items-start gap-2 animate-in fade-in slide-in-from-top-2">
                    <span><strong>Error:</strong> {errorMsg}</span>
                    <button onClick={clearError} className="hover:text-white"><SettingsIcon /></button>
                </div>
            )}
            
            {/* AI Command Center */}
            <AccordionItem title="AI Command Center" isOpenDefault={true}>
                <p className="text-sm text-text-secondary mb-2">
                    Give natural language instructions to create, update, or delete content in your World Bible or Novel Structure.
                </p>
                <form onSubmit={handleControllerSubmit}>
                    <textarea 
                        value={controllerPrompt} 
                        onChange={e => setControllerPrompt(e.target.value)} 
                        rows={3} 
                        placeholder="e.g., 'Create a new Fire Clan', 'Rename Chapter 1 to The Beginning', 'Delete the character Bob'..." 
                        className="w-full bg-primary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent mb-2" 
                    />
                    <button type="submit" disabled={!activeNovel || assistantDisabled} className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-500 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
                        {isLoading && activeTool === 'controller' ? <LoaderIcon /> : <SparklesIcon />}
                        Plan Actions
                    </button>
                </form>

                {pendingActions && (
                    <div className="mt-4 bg-secondary border border-white/10 rounded-md p-3">
                        <p className="text-xs text-text-secondary italic mb-2">{pendingActions.explanation}</p>
                        <ul className="space-y-2 mb-3">
                            {pendingActions.actions.map((action, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-xs bg-primary p-2 rounded border border-white/5">
                                    <span className={`text-white p-1 rounded ${action.action === 'delete' ? 'bg-red-500' : action.action === 'create' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                        {getActionIcon(action.action)}
                                    </span>
                                    <span className="uppercase font-bold text-[10px] w-12">{action.action}</span>
                                    <span className="truncate flex-grow">
                                        {action.type.toUpperCase()}: {(action as any).data?.name || (action as any).data?.title || (action as any).id}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex gap-2">
                            <button onClick={() => setPendingActions(null)} className="flex-1 bg-secondary text-text-secondary p-1.5 rounded-md text-xs hover:bg-white/10">Cancel</button>
                            <button onClick={handleExecuteActions} className="flex-1 bg-green-600 text-white p-1.5 rounded-md text-xs hover:bg-green-500 font-bold">Execute All</button>
                        </div>
                    </div>
                )}
            </AccordionItem>

            <AccordionItem title="World Recommendations">
                <p className="text-sm text-text-secondary mb-2">Get AI suggestions on how to better integrate your World Bible into the current scene.</p>
                <button onClick={handleWorldRecommendations} disabled={!activeChapter || assistantDisabled} className="w-full bg-accent text-white p-2 rounded-md hover:bg-sky-400 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading && activeTool === 'world-recs' ? <LoaderIcon /> : <SparklesIcon />} Get World Recommendations
                </button>
                {worldRecs.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {worldRecs.map((item, index) => (
                            <div key={index} className="bg-primary p-3 rounded-md border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-accent/20 text-accent">{item.type}</span>
                                </div>
                                <p className="font-semibold text-sm text-white mb-1">{item.suggestion}</p>
                                <p className="text-xs text-text-secondary italic">{item.reason}</p>
                            </div>
                        ))}
                    </div>
                )}
            </AccordionItem>

            <AccordionItem title="Story Forward">
                <p className="text-sm text-text-secondary mb-2">Stuck? Let AI analyze your chapter and World Bible to suggest logical next steps.</p>
                <button onClick={handleSuggestNextEvents} disabled={!activeChapter || assistantDisabled} className="w-full bg-accent text-white p-2 rounded-md hover:bg-sky-400 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading && activeTool === 'next-events' ? <LoaderIcon /> : <SparklesIcon />} Suggest Next Events
                </button>
                {nextEvents.length > 0 && <div className="mt-4 space-y-3">{nextEvents.map((item, index) => <div key={index} className="bg-primary p-3 rounded-md border border-white/5"><p className="font-semibold text-sm text-white mb-1">{item.event}</p><p className="text-xs text-text-secondary italic">{item.reason}</p></div>)}</div>}
            </AccordionItem>

            {isScriptMode && (
                <AccordionItem title="Script Doctor">
                    <button onClick={handleScriptDoctor} disabled={!activeChapter || assistantDisabled} className="w-full bg-red-600 text-white p-2 rounded-md hover:bg-red-500 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isLoading && activeTool === 'script-doctor' ? <LoaderIcon /> : <SparklesIcon />} Analyze Script
                    </button>
                    {scriptDoctorAnalysis && <div className="mt-4 p-2 bg-primary rounded-md text-sm whitespace-pre-wrap">{scriptDoctorAnalysis}</div>}
                </AccordionItem>
            )}

             <AccordionItem title="Consistency Guardian">
                <button onClick={handleConsistencyCheck} disabled={!activeChapter || assistantDisabled} className="w-full bg-accent text-white p-2 rounded-md hover:bg-sky-400 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading && activeTool === 'consistency' ? <LoaderIcon /> : <SparklesIcon />} Check for Inconsistencies
                </button>
                {consistencyResult && (
                    <div className="mt-4 space-y-3 max-h-60 overflow-y-auto p-2 bg-primary rounded-md text-sm">
                        {consistencyResult.length === 0 ? <p>No inconsistencies found.</p> : consistencyResult.map((item, index) => (
                            <div key={index} className="border-b border-slate-700 pb-2 mb-2 last:border-b-0">
                                <p className="text-text-secondary italic">"<span className="font-semibold text-red-400">{item.problematicText}</span>"</p>
                                <p className="my-1"><strong className="text-accent">Issue:</strong> {item.issue}</p>
                                <ul className="list-disc list-inside text-text-secondary">{item.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                        ))}
                    </div>
                )}
            </AccordionItem>
            
             <AccordionItem title="Plot Twist & Idea Generator">
                <button onClick={handleSuggestPlotTwists} disabled={!activeChapter || !activeNovel?.logline || assistantDisabled} className="w-full bg-accent text-white p-2 rounded-md hover:bg-sky-400 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading && activeTool === 'plot' ? <LoaderIcon /> : <SparklesIcon />} Generate Ideas
                </button>
                {plotTwists && <div className="mt-4 space-y-3 max-h-60 overflow-y-auto p-2 bg-primary rounded-md text-sm">{plotTwists.map((twist, index) => <div key={index} className="border-b border-slate-700 pb-2 mb-2 last:border-b-0"><h4 className="font-bold text-accent">{twist.title}</h4><p className="text-text-secondary">{twist.description}</p></div>)}</div>}
            </AccordionItem>

            <AccordionItem title={isScriptMode ? "Pacing & Visuals Analyst" : "Pacing Analyst"}>
                <button onClick={handleAnalyzePacing} disabled={!activeChapter || assistantDisabled} className="w-full bg-accent text-white p-2 rounded-md hover:bg-sky-400 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading && activeTool === 'pacing' ? <LoaderIcon /> : <SparklesIcon />} Analyze {isScriptMode ? 'Scene' : 'Chapter'} Draft
                </button>
                {analysis && <div className="mt-4 p-2 bg-primary rounded-md text-sm whitespace-pre-wrap">{analysis}</div>}
            </AccordionItem>
            
            <AccordionItem title="Character Generator">
                <form onSubmit={handleCharacterGenerator}>
                    <textarea value={characterPrompt} onChange={e => setCharacterPrompt(e.target.value)} rows={3} placeholder="Describe a character..." className="w-full bg-primary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent mb-2" />
                    <button type="submit" disabled={!activeNovel || assistantDisabled} className="w-full bg-accent text-white p-2 rounded-md hover:bg-sky-400 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isLoading && activeTool === 'character' ? <LoaderIcon /> : <SparklesIcon />} Generate Character
                    </button>
                </form>
            </AccordionItem>

            <AccordionItem title={isScriptMode ? "Beat Sheet Generator" : "Plot/Outline Generator"}>
                <button onClick={handleGenerateOutline} disabled={!activeNovel || !activeNovel.logline || assistantDisabled} className="w-full bg-accent text-white p-2 rounded-md hover:bg-sky-400 disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading && activeTool === 'outline' ? <LoaderIcon /> : <SparklesIcon />} Generate {isScriptMode ? 'Beat Sheet' : 'Outline'}
                </button>
                {outline.length > 0 && <div className="mt-4"><ul className="space-y-2 text-sm max-h-60 overflow-y-auto p-2 bg-primary rounded-md">{outline.map((item, index) => <li key={index}><strong>{item.title}:</strong> {item.summary}</li>)}</ul><button onClick={handleConfirmOutline} disabled={!activeBook} className="w-full mt-2 bg-green-600 text-white p-2 rounded-md hover:bg-green-500">Add to {isScriptMode ? 'Scenes' : 'Chapters'}</button></div>}
            </AccordionItem>
        </div>
    );
};

export default GeminiAssistant;

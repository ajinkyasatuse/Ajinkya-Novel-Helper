
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Chapter, Scene, NovelType, WorldEntityType, BetaComment } from '../types';
import { UndoIcon, RedoIcon, GrammarCheckIcon, SparklesIcon, LoaderIcon, HistoryIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, LinkIcon, CommentIcon, CloseIcon, SaveIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import SuggestionModal from './SuggestionModal';
import VersionHistoryModal from './VersionHistoryModal';
import ScriptSceneModal from './ScriptSceneModal';
import { db } from '../services/firebase';
import { doc, collection, onSnapshot, query, where, orderBy, updateDoc } from 'firebase/firestore';

// Debounce hook
function useDebounce<T,>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface OutlineItemProps {
    scene: Scene;
    onUpdate: (id: string, updates: Partial<Scene>) => void;
    onDelete: (id: string) => void;
    onMove: (id: string, direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
}

const OutlineItem: React.FC<OutlineItemProps> = ({ scene, onUpdate, onDelete, onMove, isFirst, isLast }) => {
    const [title, setTitle] = useState(scene.title);
    const [summary, setSummary] = useState(scene.content);

    const debouncedTitle = useDebounce(title, 1000);
    const debouncedSummary = useDebounce(summary, 1000);

    useEffect(() => {
        if (debouncedTitle !== scene.title || debouncedSummary !== scene.content) {
            onUpdate(scene.id, { title: debouncedTitle, content: debouncedSummary });
        }
    }, [debouncedTitle, debouncedSummary, scene.id, onUpdate]);

    return (
        <div className="bg-primary p-3 rounded-lg border border-white/5 space-y-2 shadow-sm">
            <div className="flex justify-between items-center">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Outline item title"
                    className="font-semibold bg-transparent focus:outline-none focus:bg-white/5 rounded px-1 w-full text-sm"
                />
                <div className="flex items-center opacity-60 hover:opacity-100 transition-opacity">
                    <button onClick={() => onMove(scene.id, 'up')} disabled={isFirst} className="p-1 rounded hover:bg-white/10 disabled:opacity-30"><ChevronUpIcon /></button>
                    <button onClick={() => onMove(scene.id, 'down')} disabled={isLast} className="p-1 rounded hover:bg-white/10 disabled:opacity-30"><ChevronDownIcon /></button>
                    <button onClick={() => onDelete(scene.id)} className="p-1 rounded hover:bg-red-500/20 hover:text-red-400"><TrashIcon /></button>
                </div>
            </div>
            <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={2}
                placeholder="Brief summary..."
                className="w-full bg-secondary/50 rounded-md p-2 text-xs text-text-secondary resize-y focus:outline-none border border-transparent focus:border-white/10"
            />
        </div>
    );
};

interface EditorProps {
  chapter: Chapter;
  onUpdateChapter: (chapterId: string, updates: Partial<Omit<Chapter, 'id'>>) => void;
  onManualSave?: (chapterId: string, updates: Partial<Omit<Chapter, 'id'>>) => Promise<void>;
  novelType?: NovelType;
  worldData?: { [key: string]: WorldEntityType[] };
  shareId?: string; // New prop for beta comments
}

const Editor: React.FC<EditorProps> = ({ chapter, onUpdateChapter, onManualSave, novelType = 'novel', worldData = {}, shareId }) => {
  const [content, setContent] = useState(chapter.content || '');
  const [notes, setNotes] = useState(chapter.notes || '');
  const [outline, setOutline] = useState(chapter.outline || []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'outline' | 'comments'>('outline');
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Ghost Text State
  const [ghostText, setGhostText] = useState('');
  const [isFetchingGhost, setIsFetchingGhost] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  // Manual Save State
  const [isSaving, setIsSaving] = useState(false);

  const debouncedContent = useDebounce(content, 1500);
  const debouncedNotes = useDebounce(notes, 1500);

  const [history, setHistory] = useState([chapter.content || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isNavigatingHistory = useRef(false);
  const location = useLocation();

  // Deep Linking / Scroll to Text
  useEffect(() => {
      if (location.state?.highlightSnippet) {
          const snippet = location.state.highlightSnippet;
          // Remove "..." if present and trim
          const cleanSnippet = snippet.replace(/^\.\.\.|\.\.\.$/g, '').trim();
          // Strip HTML tags to match against textContent
          const textSnippet = new DOMParser().parseFromString(cleanSnippet, 'text/html').body.textContent || "";
          
          if (!textSnippet) return;

          const findAndScroll = () => {
              if (!editorRef.current) return;
              
              // Simple text search in DOM nodes
              const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);
              let node;
              while (node = walker.nextNode()) {
                  if (node.textContent?.includes(textSnippet)) {
                      const element = node.parentElement;
                      if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          
                          // Visual Highlight Effect
                          element.classList.add('bg-yellow-500/30', 'transition-colors', 'duration-1000');
                          setTimeout(() => {
                              element.classList.remove('bg-yellow-500/30');
                          }, 3000);
                          return;
                      }
                  }
              }
          };
          
          // Small delay to ensure content is rendered
          setTimeout(findAndScroll, 500);
      }
  }, [location.state, chapter.id]);

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [suggestionModalState, setSuggestionModalState] = useState<{ isOpen: boolean; title: string; originalText: string; suggestedText: string; type: 'grammar' | 'enhance' | null; }>({ isOpen: false, title: '', originalText: '', suggestedText: '', type: null });
  const [isRewriteOpen, setIsRewriteOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isScriptSceneModalOpen, setIsScriptSceneModalOpen] = useState(false);
  
  // Wiki Link Popover State
  const [activeWikiEntity, setActiveWikiEntity] = useState<{ entity: WorldEntityType; x: number; y: number } | null>(null);

  // Beta Comments State
  const [betaComments, setBetaComments] = useState<BetaComment[]>([]);

  // Initialize content on load
  useEffect(() => {
      if (editorRef.current && editorRef.current.innerHTML !== chapter.content) {
          editorRef.current.innerHTML = chapter.content || '';
          setContent(chapter.content || '');
      }
      setNotes(chapter.notes || '');
      setOutline(chapter.outline || []);
      setHistory([chapter.content || '']);
      setHistoryIndex(0);
  }, [chapter.id]);

  // Fetch Beta Comments
  useEffect(() => {
      if (!shareId) return;
      // Fetch comments for this chapter from shared collection
      const q = query(
          collection(db, 'shared_novels', shareId, 'comments'),
          where('chapterId', '==', chapter.id),
          orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BetaComment));
          setBetaComments(loaded);
      });
      return () => unsubscribe();
  }, [shareId, chapter.id]);

  const handleResolveComment = async (commentId: string, currentStatus: boolean) => {
      if(!shareId) return;
      try {
          await updateDoc(doc(db, 'shared_novels', shareId, 'comments', commentId), {
              resolved: !currentStatus
          });
      } catch (e) {
          console.error("Error resolving comment:", e);
      }
  }

  const handleInput = () => {
      if (editorRef.current) {
          const newContent = editorRef.current.innerHTML;
          setContent(newContent);
          
          // Ghost Text Trigger
          setGhostText('');
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          
          typingTimeoutRef.current = setTimeout(async () => {
             // Only fetch if meaningful text exists and we are at the end
             const plainText = editorRef.current?.innerText || '';
             // Ensure we have enough context but not just whitespace
             if (plainText.trim().length > 50 && !isFetchingGhost) {
                 setIsFetchingGhost(true);
                 try {
                     // Ghost text fetch logic with silent error catch
                     const suggestion = await geminiService.generateGhostText(plainText, novelType as NovelType, worldData);
                     if (suggestion) setGhostText(suggestion);
                 } catch (e) {
                     // Silently fail for ghost text to not interrupt flow
                     // console.warn("Ghost text failed", e);
                 } finally {
                     setIsFetchingGhost(false);
                 }
             }
          }, 2000); // Wait 2 seconds after typing stops
      }
  };

  const handleWikiLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('wiki-link')) {
          const entityId = target.getAttribute('data-id');
          if (entityId) {
              const allEntities = Object.values(worldData).flat() as WorldEntityType[];
              const entity = allEntities.find(ent => ent.id === entityId);
              if (entity) {
                  // Calculate popover position
                  const rect = target.getBoundingClientRect();
                  setActiveWikiEntity({
                      entity,
                      x: rect.left,
                      y: rect.bottom + window.scrollY
                  });
                  return;
              }
          }
      }
      setActiveWikiEntity(null);
  };

  useEffect(() => {
      const editor = editorRef.current;
      if (editor) {
          editor.addEventListener('click', handleWikiLinkClick);
          return () => editor.removeEventListener('click', handleWikiLinkClick);
      }
  }, [worldData]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); // Sync state
  };
  
  const handleAutoLinkEntities = () => {
      if (!editorRef.current) return;
      
      const allEntities = Object.values(worldData).flat() as WorldEntityType[];
      // Sort by name length descending to match longest names first
      allEntities.sort((a, b) => b.name.length - a.name.length);
      
      let html = editorRef.current.innerHTML;
      
      // Temporary placeholder to avoid nested replacements
      // This is a naive implementation. Robust implementation requires traversing text nodes.
      // For "lightweight", we stick to regex but skip existing links.
      
      allEntities.forEach(entity => {
          if (entity.name.length < 3) return; // Skip very short names to avoid noise
          
          // Regex: word boundary + name + word boundary, NOT already inside a tag
          const regex = new RegExp(`\\b(${entity.name})\\b(?![^<]*>|[^<>]*<\\/span>)`, 'gi');
          
          html = html.replace(regex, (match) => {
              // Check if we are already linked (rough check due to simpler regex)
              return `<span class="wiki-link text-accent border-b border-dotted border-accent/50 cursor-pointer hover:bg-accent/10" contenteditable="false" data-id="${entity.id}">${match}</span>`;
          });
      });
      
      editorRef.current.innerHTML = html;
      handleInput();
  };

  const handleManualSaveClick = async () => {
      if (!onManualSave) return;
      setIsSaving(true);
      try {
          await onManualSave(chapter.id, { content, notes, outline });
      } catch (e) {
          console.error("Manual save failed", e);
      } finally {
          setIsSaving(false);
      }
  };

  // ... (insertScriptElement, handleScriptSceneSubmit, handleSmartFormat, handleKeyDown, handleUndo, handleRedo, handleGrammarCheck, handleEnhance, handleAcceptSuggestion, handleCloseSuggestionModal, handleUpdateOutlineItem, handleAddOutlineItem, handleDeleteOutlineItem, handleMoveOutlineItem, handleRevertToVersion - Keep these exactly as is) ...
  const insertScriptElement = (type: 'scene-heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition') => {
      if (type === 'scene-heading') {
          setIsScriptSceneModalOpen(true);
          return;
      }

      editorRef.current?.focus();
      let selection = window.getSelection();
      
      if (!selection || selection. rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) {
          if(editorRef.current) {
             const range = document.createRange();
             range.selectNodeContents(editorRef.current);
             range.collapse(false);
             selection?.removeAllRanges();
             selection?.addRange(range);
             selection = window.getSelection();
          } else {
              return;
          }
      }

      let htmlToInsert = '';
      let textToSelect = ''; 

      switch(type) {
        case 'character':
            htmlToInsert = `<div class="character">CHARACTER NAME</div>`;
            textToSelect = 'CHARACTER NAME';
            break;
        case 'dialogue':
            htmlToInsert = `<div class="dialogue">Dialogue...</div>`;
            textToSelect = 'Dialogue...';
            break;
        case 'parenthetical':
            htmlToInsert = `<div class="parenthetical">(action)</div>`;
            textToSelect = 'action';
            break;
        case 'transition':
            htmlToInsert = `<div class="transition">CUT TO:</div>`;
            break;
        case 'action':
            htmlToInsert = `<div class="action">Action description...</div>`;
            textToSelect = 'Action description...';
            break;
      }
      
      document.execCommand('insertHTML', false, htmlToInsert);

      if (textToSelect && editorRef.current) {
          setTimeout(() => {
              const walker = document.createTreeWalker(editorRef.current!, NodeFilter.SHOW_TEXT, null);
              let node;
              while (node = walker.nextNode()) {
                  if (node.nodeValue && node.nodeValue.includes(textToSelect)) {
                      const range = document.createRange();
                      const start = node.nodeValue.indexOf(textToSelect);
                      range.setStart(node, start);
                      range.setEnd(node, start + textToSelect.length);
                      const sel = window.getSelection();
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                      break;
                  }
              }
          }, 0);
      }

      handleInput();
  };
  
  const handleScriptSceneSubmit = (heading: string, details?: string) => {
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) {
           if(editorRef.current) {
             const range = document.createRange();
             range.selectNodeContents(editorRef.current);
             range.collapse(false);
             selection?.removeAllRanges();
             selection?.addRange(range);
          }
      }
      const html = `<div class="scene-heading" data-context="${details || ''}">${heading}</div><div class="action"><br></div>`;
      document.execCommand('insertHTML', false, html);
      handleInput();
  };
  
  const handleSmartFormat = async () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (!selectedText) {
          alert("Please select some text (prose) to convert to script format.");
          return;
      }
      
      setIsLoadingAI(true);
      try {
          const scriptHtml = await geminiService.smartFormatScript(selectedText, worldData);
          document.execCommand('insertHTML', false, scriptHtml);
          handleInput();
      } catch (error) {
          console.error("Smart format failed", error);
          alert("Failed to format text. Please try again.");
      } finally {
          setIsLoadingAI(false);
      }
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Tab' && ghostText) {
          e.preventDefault();
          document.execCommand('insertText', false, ghostText);
          setGhostText('');
          handleInput();
          return;
      }
      
      if (novelType === 'script' && e.key === 'Enter' && !e.shiftKey) {
           const selection = window.getSelection();
           if(selection?.anchorNode?.parentElement) {
                const parent = selection.anchorNode.parentElement;
                if (parent.classList.contains('character')) {
                     e.preventDefault();
                     document.execCommand('insertHTML', false, '<div class="dialogue"><br></div>');
                     return;
                }
                if (parent.classList.contains('parenthetical')) {
                     e.preventDefault();
                     document.execCommand('insertHTML', false, '<div class="dialogue"><br></div>');
                     return;
                }
                if (parent.classList.contains('scene-heading') || parent.classList.contains('transition')) {
                     e.preventDefault();
                     document.execCommand('insertHTML', false, '<div class="action"><br></div>');
                     return;
                }
                if (parent.classList.contains('dialogue')) {
                     e.preventDefault();
                     document.execCommand('insertHTML', false, '<div class="action"><br></div>');
                     return;
                }
           }
      }
  };

  useEffect(() => {
    if (debouncedContent !== chapter.content) {
      onUpdateChapter(chapter.id, { content: debouncedContent });
    }
  }, [debouncedContent, chapter.id, onUpdateChapter]);

  useEffect(() => {
    if (debouncedNotes !== (chapter.notes || '')) {
      onUpdateChapter(chapter.id, { notes: debouncedNotes });
    }
  }, [debouncedNotes, chapter.id, onUpdateChapter]);

  useEffect(() => {
    if (isNavigatingHistory.current) {
        isNavigatingHistory.current = false;
        return;
    }
    if (debouncedContent !== history[historyIndex]) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(debouncedContent);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  }, [debouncedContent]);


  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
        isNavigatingHistory.current = true;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const newContent = history[newIndex];
        setContent(newContent);
        if (editorRef.current) editorRef.current.innerHTML = newContent;
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          isNavigatingHistory.current = true;
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          const newContent = history[newIndex];
          setContent(newContent);
           if (editorRef.current) editorRef.current.innerHTML = newContent;
      }
  }, [history, historyIndex]);

  const handleGrammarCheck = async () => {
    setIsLoadingAI(true);
    const plainText = editorRef.current?.innerText || '';
    setSuggestionModalState({ isOpen: true, title: 'Grammar & Spelling Check', originalText: plainText, suggestedText: '', type: 'grammar' });
    try {
        const result = await geminiService.checkGrammar(plainText);
        setSuggestionModalState(prev => ({ ...prev, suggestedText: result }));
    } catch (error) {
        console.error(error);
        alert((error as Error).message);
        handleCloseSuggestionModal();
    } finally {
        setIsLoadingAI(false);
    }
  };

  const handleEnhance = async (style: geminiService.EnhanceStyle, title: string) => {
    setIsLoadingAI(true);
    setIsRewriteOpen(false);
    const plainText = editorRef.current?.innerText || '';
    setSuggestionModalState({ isOpen: true, title, originalText: plainText, suggestedText: '', type: 'enhance' });
    try {
        const result = await geminiService.enhanceWriting(plainText, style);
        setSuggestionModalState(prev => ({ ...prev, suggestedText: result }));
    } catch (error) {
        console.error(error);
        alert((error as Error).message);
        handleCloseSuggestionModal();
    } finally {
        setIsLoadingAI(false);
    }
  };

  const handleAcceptSuggestion = () => {
    const newContent = suggestionModalState.suggestedText.replace(/\n/g, '<br>'); 
    setContent(newContent);
    if (editorRef.current) editorRef.current.innerHTML = newContent;
    handleCloseSuggestionModal();
  };

  const handleCloseSuggestionModal = () => setSuggestionModalState({ isOpen: false, title: '', originalText: '', suggestedText: '', type: null });

  const handleUpdateOutlineItem = (id: string, updates: Partial<Scene>) => {
    const newOutline = outline.map(s => s.id === id ? { ...s, ...updates } : s);
    setOutline(newOutline);
    onUpdateChapter(chapter.id, { outline: newOutline });
  };

  const handleAddOutlineItem = () => {
    const newItem: Scene = {
        id: Date.now().toString() + '_scene',
        title: `Scene ${outline.length + 1}`,
        content: '', wordCount: 0
    };
    const newOutline = [...outline, newItem];
    setOutline(newOutline);
    onUpdateChapter(chapter.id, { outline: newOutline });
  };
  
  const handleDeleteOutlineItem = (id: string) => {
    const newOutline = outline.filter(s => s.id !== id);
    setOutline(newOutline);
    onUpdateChapter(chapter.id, { outline: newOutline });
  };

  const handleMoveOutlineItem = (id: string, direction: 'up' | 'down') => {
    const index = outline.findIndex(s => s.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === outline.length - 1)) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newOutline = [...outline];
    const [movedItem] = newOutline.splice(index, 1);
    newOutline.splice(newIndex, 0, movedItem);
    setOutline(newOutline);
    onUpdateChapter(chapter.id, { outline: newOutline });
  };
  
  const handleRevertToVersion = (versionContent: string) => {
    setContent(versionContent);
    if(editorRef.current) editorRef.current.innerHTML = versionContent;
    onUpdateChapter(chapter.id, { content: versionContent });
    setIsHistoryModalOpen(false);
  };
  
  const toggleSidebar = (tab: 'outline' | 'comments') => {
      if (isSidebarOpen && activeSidebarTab === tab) {
          setIsSidebarOpen(false);
      } else {
          setActiveSidebarTab(tab);
          setIsSidebarOpen(true);
      }
  };
  
  const rewriteOptions: { style: geminiService.EnhanceStyle; label: string; description: string }[] = [
    { style: 'improve', label: 'Improve Writing', description: 'Enhance clarity, flow, and vocabulary.' },
    { style: 'action', label: 'More Action-Packed', description: 'Increase tension and use dynamic language.' },
    { style: 'peaceful', label: 'More Descriptive', description: 'Add sensory details and vivid imagery.' },
    { style: 'dialogue', label: 'Improve Dialogue', description: 'Make conversations more natural and impactful.' },
  ];

    const [isAssistOpen, setIsAssistOpen] = useState(false);

    const handleAiAssist = async (type: 'continue' | 'describe' | 'twist' | 'dialogue' | 'recommend', label: string) => {
        setIsLoadingAI(true);
        setIsAssistOpen(false);
        const plainText = editorRef.current?.innerText || '';
        setSuggestionModalState({ isOpen: true, title: `AI Assist: ${label}`, originalText: plainText.slice(-500), suggestedText: '', type: 'enhance' });
        
        try {
            let result = '';
            if (type === 'recommend') {
                const recs = await geminiService.generateWorldRecommendations(plainText, worldData);
                result = recs.map(r => `**[${r.type}] ${r.suggestion}**\n*${r.reason}*`).join('\n\n');
            } else {
                result = await geminiService.generateContextAwareSuggestions(plainText, worldData, type as any);
            }
            setSuggestionModalState(prev => ({ ...prev, suggestedText: result }));
        } catch (error) {
            console.error(error);
            alert((error as Error).message);
            handleCloseSuggestionModal();
        } finally {
            setIsLoadingAI(false);
        }
    };

    const assistOptions: { type: 'continue' | 'describe' | 'twist' | 'dialogue'; label: string; description: string }[] = [
        { type: 'continue', label: 'Continue Writing', description: 'Generate the next few paragraphs based on context.' },
        { type: 'describe', label: 'Describe Scene/Character', description: 'Add vivid sensory details to the current focus.' },
        { type: 'twist', label: 'Suggest Plot Twist', description: 'Generate a sudden turn of events.' },
        { type: 'dialogue', label: 'Generate Dialogue', description: 'Create a conversation relevant to the scene.' },
    ];

  return (
    <>
      <div className="flex flex-col h-full bg-primary overflow-hidden relative">
        <header className="absolute top-0 left-0 right-0 p-3 flex flex-wrap gap-2 justify-between items-center z-10 pointer-events-none">
          <h2 className="text-xl font-bold truncate max-w-xs pointer-events-auto bg-primary/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/5 shadow-sm">
            {chapter.title} {novelType === 'script' && <span className="text-[10px] align-middle bg-accent/20 text-accent px-1.5 py-0.5 rounded border border-accent/20 uppercase tracking-wide ml-2">SCRIPT</span>}
          </h2>
          
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pointer-events-auto bg-secondary/80 backdrop-blur-md rounded-xl p-1.5 border border-white/10 shadow-lg">
             <div className="flex bg-white/5 rounded-lg mr-2 p-0.5 border border-white/5">
                 <button onMouseDown={(e) => {e.preventDefault(); executeCommand('bold');}} className="p-2 hover:bg-white/10 rounded font-bold transition-colors w-8 h-8 flex items-center justify-center" title="Bold">B</button>
                 <button onMouseDown={(e) => {e.preventDefault(); executeCommand('italic');}} className="p-2 hover:bg-white/10 rounded italic transition-colors w-8 h-8 flex items-center justify-center" title="Italic">I</button>
                 <button onMouseDown={(e) => {e.preventDefault(); executeCommand('underline');}} className="p-2 hover:bg-white/10 rounded underline transition-colors w-8 h-8 flex items-center justify-center" title="Underline">U</button>
             </div>

             {/* Wiki Linker Button */}
             <button onMouseDown={(e) => {e.preventDefault(); handleAutoLinkEntities();}} className="p-2 mr-1 rounded-lg hover:bg-white/10 transition-colors w-8 h-8 flex items-center justify-center text-accent" title="Auto-Link World Entities"><LinkIcon /></button>

             {/* World Recommendations Button */}
             <button 
                onMouseDown={(e) => {e.preventDefault(); handleAiAssist('recommend', 'World Recommendations');}} 
                className="p-2 mr-2 rounded-lg hover:bg-accent/20 transition-colors w-8 h-8 flex items-center justify-center text-accent" 
                title="Get AI Recommendations based on World Bible"
             >
                <SparklesIcon />
             </button>

             {novelType === 'script' && (
                 <div className="flex bg-white/5 rounded-lg mr-2 p-0.5 border border-white/5 items-center">
                    <button onMouseDown={(e) => {e.preventDefault(); insertScriptElement('scene-heading');}} className="px-2 py-1.5 hover:bg-white/10 rounded text-[10px] font-bold uppercase transition-colors border-r border-white/5" title="Scene Heading (INT./EXT.)">Scene</button>
                    <button onMouseDown={(e) => {e.preventDefault(); insertScriptElement('action');}} className="px-2 py-1.5 hover:bg-white/10 rounded text-[10px] transition-colors border-r border-white/5" title="Action">Action</button>
                    <button onMouseDown={(e) => {e.preventDefault(); insertScriptElement('character');}} className="px-2 py-1.5 hover:bg-white/10 rounded text-[10px] uppercase transition-colors border-r border-white/5" title="Character">Char</button>
                    <button onMouseDown={(e) => {e.preventDefault(); insertScriptElement('dialogue');}} className="px-2 py-1.5 hover:bg-white/10 rounded text-[10px] transition-colors border-r border-white/5" title="Dialogue">Dial</button>
                    <button onMouseDown={(e) => {e.preventDefault(); insertScriptElement('parenthetical');}} className="px-2 py-1.5 hover:bg-white/10 rounded text-[10px] italic transition-colors border-r border-white/5" title="Parenthetical">( )</button>
                    <button onMouseDown={(e) => {e.preventDefault(); insertScriptElement('transition');}} className="px-2 py-1.5 hover:bg-white/10 rounded text-[10px] uppercase transition-colors border-r border-white/5" title="Transition (CUT TO:)">Trans</button>
                    
                    <button 
                        onMouseDown={(e) => {e.preventDefault(); handleSmartFormat();}} 
                        disabled={isLoadingAI}
                        className="px-2 py-1.5 hover:bg-accent/20 text-accent rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1" 
                        title="Smart Format Selection: Convert selected prose to script using AI"
                    >
                        {isLoadingAI ? <LoaderIcon /> : <><SparklesIcon /> AI Format</>}
                    </button>
                 </div>
             )}

            <button onClick={handleManualSaveClick} disabled={isSaving} title="Save Now" className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 disabled:opacity-50 flex items-center gap-1 transition-colors w-8 h-8 justify-center">
              {isSaving ? <LoaderIcon /> : <SaveIcon />}
            </button>

            {/* AI Assist Dropdown */}
            <div className="relative">
                <button onClick={() => setIsAssistOpen(!isAssistOpen)} disabled={isLoadingAI} title="AI Assistant" className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 disabled:opacity-50 flex items-center gap-1 transition-colors w-8 h-8 justify-center">
                    {isLoadingAI ? <LoaderIcon /> : <SparklesIcon />}
                </button>
                {isAssistOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-secondary border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <p className="p-3 text-xs font-semibold text-text-secondary border-b border-white/5 bg-white/5 uppercase tracking-wider">AI Assistant</p>
                        {assistOptions.map(opt => (
                            <button key={opt.type} onClick={() => handleAiAssist(opt.type, opt.label)} className="w-full text-left p-3 hover:bg-purple-500/10 transition-colors border-b border-white/5 last:border-0 group">
                                <p className="font-semibold text-sm group-hover:text-purple-400 flex items-center gap-2"><SparklesIcon /> {opt.label}</p>
                                <p className="text-xs text-text-secondary group-hover:text-text-primary mt-1">{opt.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button onClick={handleGrammarCheck} disabled={isLoadingAI} title="Check Grammar" className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 flex items-center gap-1 transition-colors w-8 h-8 justify-center">
              {isLoadingAI ? <LoaderIcon /> : <GrammarCheckIcon />}
            </button>
             <div className="relative">
                <button onClick={() => setIsRewriteOpen(!isRewriteOpen)} disabled={isLoadingAI} title="Rewrite Chapter" className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 flex items-center gap-1 transition-colors w-8 h-8 justify-center">
                    <HistoryIcon /> {/* Changed icon to distinguish from Assist */}
                </button>
                {isRewriteOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-secondary border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <p className="p-3 text-xs font-semibold text-text-secondary border-b border-white/5 bg-white/5 uppercase tracking-wider">REWRITE SELECTION</p>
                        {rewriteOptions.map(opt => (
                            <button key={opt.style} onClick={() => handleEnhance(opt.style, opt.label)} className="w-full text-left p-3 hover:bg-accent/10 transition-colors border-b border-white/5 last:border-0 group">
                                <p className="font-semibold text-sm group-hover:text-accent">{opt.label}</p>
                                <p className="text-xs text-text-secondary group-hover:text-text-primary">{opt.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button onClick={handleUndo} disabled={historyIndex <= 0} title="Undo" className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors w-8 h-8 flex items-center justify-center"><UndoIcon /></button>
            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo" className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors w-8 h-8 flex items-center justify-center"><RedoIcon /></button>
            <button onClick={() => setIsHistoryModalOpen(true)} title="View History" className="p-2 rounded-lg hover:bg-white/10 transition-colors w-8 h-8 flex items-center justify-center"><HistoryIcon /></button>
          </div>
        </header>

        <div className="flex-grow flex overflow-hidden relative pt-16">
            <main className="flex-grow flex flex-col relative overflow-hidden">
                 <div 
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    className={`editor-content w-full h-full p-8 md:p-12 lg:px-24 lg:py-16 overflow-y-auto focus:outline-none ${novelType === 'script' ? 'font-script script-mode text-lg' : 'font-serif text-lg'} leading-relaxed custom-scrollbar`}
                    style={{ fontSize: 'var(--editor-font-size)', maxWidth: '900px', margin: '0 auto' }}
                    data-placeholder="Start writing..."
                 />
                 
                 {ghostText && (
                     <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-secondary/90 backdrop-blur border border-accent/50 text-text-primary px-5 py-3 rounded-full shadow-2xl shadow-accent/10 text-sm flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300 z-20 pointer-events-none">
                         <span className="text-accent"><SparklesIcon /></span>
                         <span><strong className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs mr-2 border border-white/10">TAB</strong> to autocomplete: <span className="italic opacity-80">"{ghostText.substring(0, 30)}..."</span></span>
                     </div>
                 )}
                 {isFetchingGhost && (
                      <div className="absolute bottom-6 right-8 text-xs text-text-secondary flex items-center gap-2 bg-secondary/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/5">
                          <LoaderIcon /> AI thinking...
                      </div>
                 )}

                 {/* Wiki Entity Popover */}
                 {activeWikiEntity && (
                     <div 
                        className="fixed bg-secondary border border-white/20 shadow-2xl rounded-xl p-3 z-50 w-64 animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: activeWikiEntity.y + 10, left: Math.min(activeWikiEntity.x, window.innerWidth - 270) }}
                     >
                         <div className="flex gap-3 mb-2">
                             {activeWikiEntity.entity.imageUrl && (
                                 <img src={activeWikiEntity.entity.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-black/20" />
                             )}
                             <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-sm truncate">{activeWikiEntity.entity.name}</h4>
                                 <p className="text-[10px] text-text-secondary uppercase tracking-wider">{activeWikiEntity.entity.category || 'Entity'}</p>
                             </div>
                         </div>
                         <p className="text-xs text-text-secondary line-clamp-3 mb-2">{activeWikiEntity.entity.description}</p>
                     </div>
                 )}

            </main>
            <aside className={`flex-shrink-0 bg-secondary border-l border-white/5 transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-10 hover:bg-white/5'} flex flex-col z-20 shadow-xl`}>
                <div className="flex flex-col h-full">
                    {/* Tab Toggles */}
                    <div className="flex flex-col items-center">
                        <button 
                            onClick={() => toggleSidebar('outline')} 
                            className={`p-3 w-full flex items-center justify-center transition-colors ${activeSidebarTab === 'outline' && isSidebarOpen ? 'text-white border-l-2 border-accent bg-white/5' : 'text-text-secondary hover:text-white'}`}
                            title="Outline"
                        >
                            {isSidebarOpen ? (
                                <span className="uppercase text-xs tracking-widest flex-grow text-left ml-2">Outline</span>
                            ) : (
                                <span className="transform -rotate-90 whitespace-nowrap text-xs tracking-widest uppercase opacity-60 mt-4 mb-4">Outline</span>
                            )}
                        </button>
                        <button 
                            onClick={() => toggleSidebar('comments')} 
                            className={`p-3 w-full flex items-center justify-center transition-colors relative ${activeSidebarTab === 'comments' && isSidebarOpen ? 'text-white border-l-2 border-accent bg-white/5' : 'text-text-secondary hover:text-white'}`}
                            title="Beta Comments"
                        >
                            <CommentIcon />
                            {betaComments.filter(c => !c.resolved).length > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                            )}
                            {isSidebarOpen && <span className="uppercase text-xs tracking-widest flex-grow text-left ml-2">Feedback</span>}
                        </button>
                    </div>

                    {isSidebarOpen && (
                        <div className="flex-grow p-3 overflow-y-auto custom-scrollbar border-t border-white/5">
                            {activeSidebarTab === 'outline' && (
                                <div className="space-y-3">
                                    {outline.length === 0 && (
                                        <div className="text-center text-text-secondary text-sm py-4 italic opacity-60">
                                            Add scenes to plan your chapter
                                        </div>
                                    )}
                                    {outline.map((scene, index) => (
                                        <OutlineItem
                                            key={scene.id}
                                            scene={scene}
                                            onUpdate={handleUpdateOutlineItem}
                                            onDelete={handleDeleteOutlineItem}
                                            onMove={handleMoveOutlineItem}
                                            isFirst={index === 0}
                                            isLast={index === outline.length - 1}
                                        />
                                    ))}
                                    <button onClick={handleAddOutlineItem} className="w-full mt-2 bg-white/5 border border-dashed border-white/20 text-text-secondary hover:text-white p-2 rounded-lg hover:bg-white/10 flex items-center justify-center gap-2 text-sm transition-all">
                                        <PlusIcon /> Add Scene
                                    </button>
                                </div>
                            )}

                            {activeSidebarTab === 'comments' && (
                                <div className="space-y-3">
                                    {shareId ? (
                                        betaComments.length === 0 ? (
                                            <div className="text-center text-text-secondary text-sm py-4 italic opacity-60">
                                                No feedback yet. Share your novel to get comments!
                                            </div>
                                        ) : (
                                            betaComments.map(comment => (
                                                <div key={comment.id} className={`bg-primary p-3 rounded-lg border text-sm transition-opacity ${comment.resolved ? 'border-green-500/20 opacity-60' : 'border-white/10'}`}>
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className={`font-bold ${comment.resolved ? 'text-green-400' : 'text-accent'}`}>{comment.readerName}</span>
                                                        <span className="text-[10px] text-text-secondary">{new Date(comment.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                    {comment.selectedText && (
                                                        <div className="pl-2 border-l-2 border-white/10 text-xs italic text-text-secondary mb-2 line-clamp-3">
                                                            "{comment.selectedText}"
                                                        </div>
                                                    )}
                                                    <p className={comment.resolved ? 'line-through text-text-secondary' : ''}>{comment.comment}</p>
                                                    <div className="mt-2 flex justify-end">
                                                        <button 
                                                            onClick={() => handleResolveComment(comment.id, !!comment.resolved)}
                                                            className={`text-[10px] px-2 py-1 rounded border transition-colors ${comment.resolved ? 'bg-secondary text-text-secondary border-white/10' : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'}`}
                                                        >
                                                            {comment.resolved ? 'Undo Resolve' : 'Mark Resolved'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    ) : (
                                        <div className="text-center text-text-secondary text-sm py-4">
                                            This novel hasn't been shared yet. Use the Share button in the dashboard.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </div>

        <footer className="flex-shrink-0 border-t border-white/5 p-4 hidden md:block bg-secondary/30 backdrop-blur-sm">
            <label htmlFor="author-notes" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Author's Notes (Private)</label>
            <textarea
                id="author-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-16 bg-primary/50 border border-white/10 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-text-secondary/30"
                placeholder="Add private notes, reminders, or ideas for this chapter..."
            />
        </footer>
      </div>
      
      <SuggestionModal isOpen={suggestionModalState.isOpen} onClose={handleCloseSuggestionModal} onAccept={handleAcceptSuggestion} title={suggestionModalState.title} originalText={suggestionModalState.originalText} suggestedText={suggestionModalState.suggestedText} isLoading={isLoadingAI} />
      <VersionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} onRevert={handleRevertToVersion} history={chapter.versionHistory || []} />
      <ScriptSceneModal isOpen={isScriptSceneModalOpen} onClose={() => setIsScriptSceneModalOpen(false)} onSubmit={handleScriptSceneSubmit} />
    </>
  );
};

export default Editor;

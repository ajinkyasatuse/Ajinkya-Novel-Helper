
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Sidebar from '../components/Sidebar';
import GeminiAssistant from '../components/GeminiAssistant';
import StatusBar from '../components/StatusBar';
import { MenuIcon, BrainIcon, CloseIcon, SearchIcon, EditIcon, PinIcon, WorldIcon, TimelineIcon, BinIcon, FocusIcon, ExitFocusIcon } from '../components/Icons';
import SearchModal from '../components/SearchModal';
import WorldItemManager, { TabName } from '../components/WorldItemManager';
import Settings from '../components/Settings';
import ImportExportModal from '../components/ImportExportModal';
import { doc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Novel, Book, Chapter, Character, CustomEntity, Theme } from '../types';
import { AppAction } from '../services/geminiService';
import ErrorBoundary from '../ErrorBoundary';

const ProjectLayout: React.FC = () => {
    const { activeNovel, worldData, saveDocument, debouncedSaveDocument, deleteDocument, saveStatus, lastSave, loading } = useProject();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { novelId, bookId, chapterId } = useParams();

    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isWorldManagerOpen, setIsWorldManagerOpen] = useState(false);
    const [worldManagerTarget, setWorldManagerTarget] = useState<{tab: TabName, id: string} | null>(null);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isImportExportOpen, setIsImportExportOpen] = useState(false);

    // Settings State
    const [theme, setTheme] = useState<Theme>('ajinkya-dark');
    const [fontSize, setFontSize] = useState(18);
    const [customTheme, setCustomTheme] = useState({
        '--color-primary': '#ffffff',
        '--color-secondary': '#f4f4f5',
        '--color-accent': '#0ea5e9',
        '--color-text-primary': '#18181b',
        '--color-text-secondary': '#71717a',
    });

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.style.setProperty('--editor-font-size', `${fontSize}px`);
        if (theme === 'custom') {
            Object.entries(customTheme).forEach(([key, value]) => {
                root.style.setProperty(key, value as string);
            });
        }
    }, [theme, fontSize, customTheme]);

    // Derived State
    const activeBook = activeNovel?.books?.find(b => b.id === bookId);
    const activeChapter = activeBook?.chapters?.find(c => c.id === chapterId);
    
    // UI Helpers
    const viewMode = location.pathname.split('/').pop() || 'editor';
    const isEditor = location.pathname.includes('/editor');

    const handleNavigate = (path: string) => {
        navigate(`/novel/${novelId}/${path}`);
        setIsMobileNavOpen(false);
    };

    // --- Sidebar Handlers ---
    const handleAddBook = (title: string) => {
        if (!activeNovel) return;
        const newBook: Book = { id: doc(collection(db, 'users')).id, title, chapters: [] };
        const updatedBooks = [...(activeNovel.books || []), newBook];
        saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
        navigate(`/novel/${activeNovel.id}/editor/${newBook.id}`);
    };

    const handleAddChapter = (title: string) => {
        if (!activeNovel || !bookId) return;
        const newChapter: Chapter = {
            id: doc(collection(db, 'users')).id,
            title,
            content: '',
            outline: [],
            wordCount: 0,
            versionHistory: []
        };
        const updatedBooks = activeNovel.books.map(b => 
            b.id === bookId ? { ...b, chapters: [...(b.chapters || []), newChapter] } : b
        );
        saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
        navigate(`/novel/${activeNovel.id}/editor/${bookId}/${newChapter.id}`);
    };

    const updateNovelDetails = (id: string, updates: Partial<Novel>) => debouncedSaveDocument('novels', id, { ...activeNovel, ...updates });
    
    const updateBookTitle = (bId: string, title: string) => {
        if (!activeNovel) return;
        const updated = activeNovel.books.map(b => b.id === bId ? { ...b, title } : b);
        saveDocument('novels', activeNovel.id, { ...activeNovel, books: updated });
    };

    const updateChapterTitle = (cId: string, title: string) => {
        if (!activeNovel || !activeBook) return;
        const updatedBooks = activeNovel.books.map(b => {
            if (b.id === activeBook.id) {
                return { ...b, chapters: b.chapters.map(c => c.id === cId ? { ...c, title } : c) };
            }
            return b;
        });
        saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
    };

    const softDelete = (type: 'novel' | 'book' | 'chapter', id: string) => {
        if (!activeNovel) return;
        const deletedAt = Date.now();
        if (type === 'novel') {
            saveDocument('novels', activeNovel.id, { ...activeNovel, deletedAt });
            navigate('/');
        } else if (type === 'book') {
            const updated = activeNovel.books.map(b => b.id === id ? { ...b, deletedAt } : b);
            saveDocument('novels', activeNovel.id, { ...activeNovel, books: updated });
        } else if (type === 'chapter' && activeBook) {
            const updatedBooks = activeNovel.books.map(b => 
                b.id === activeBook.id ? { ...b, chapters: b.chapters.map(c => c.id === id ? { ...c, deletedAt } : c) } : b
            );
            saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
        }
    };

    // --- Import/Export Handlers ---
    const handleExportAllData = () => {
        if (!activeNovel) return {
            novels: [], characters: [], regions: [], lores: [], events: [], items: [], clans: [], creatures: [], magicalThings: [], dialogs: [], poems: [], quotes: [], customEntities: []
        };
        return {
            novels: [activeNovel],
            ...worldData
        };
    };

    const handleAddImportedEntities = (entities: any[], type: string) => {
        if (!activeNovel) return;
        entities.forEach(entity => {
            const newEntity = { ...entity, id: doc(collection(db, 'users')).id, novelId: activeNovel.id };
            saveDocument(type, newEntity.id, newEntity);
        });
    };

    // --- Assistant Handlers ---
    const handleAddChaptersBatch = (chapters: {title: string, summary: string}[]) => {
        if (!activeNovel || !bookId) return;
        const newChapters = chapters.map(c => ({
            id: doc(collection(db, 'users')).id,
            title: c.title,
            content: `<p>${c.summary}</p>`,
            wordCount: c.summary.split(' ').length,
            outline: [],
            versionHistory: []
        }));
        const updatedBooks = activeNovel.books.map(b => 
            b.id === bookId ? { ...b, chapters: [...(b.chapters || []), ...newChapters] } : b
        );
        saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
    };

    const handleAddCharacter = (charData: Omit<Character, 'id' | 'novelId'>) => {
        if (!activeNovel || !currentUser) return;
        const newChar = { ...charData, id: doc(collection(db, 'users')).id, novelId: activeNovel.id };
        saveDocument('characters', newChar.id, newChar);
    };

    // --- The "Ultimate" Controller Action Handler ---
    const handleAIAction = (action: AppAction) => {
        if (!activeNovel) return;

        // Handling Novel Structure Changes
        if (action.type === 'books' || action.type === 'chapters') {
            const currentBooks = [...activeNovel.books];
            
            if (action.type === 'books') {
                if (action.action === 'create') {
                    const newBook: Book = { id: doc(collection(db, 'users')).id, title: action.data.title || 'New Book', chapters: [] };
                    saveDocument('novels', activeNovel.id, { ...activeNovel, books: [...currentBooks, newBook] });
                } else if (action.action === 'update' && action.id) {
                    const updated = currentBooks.map(b => b.id === action.id ? { ...b, ...action.data } : b);
                    saveDocument('novels', activeNovel.id, { ...activeNovel, books: updated });
                } else if (action.action === 'delete' && action.id) {
                    const updated = currentBooks.map(b => b.id === action.id ? { ...b, deletedAt: Date.now() } : b);
                    saveDocument('novels', activeNovel.id, { ...activeNovel, books: updated });
                }
            } else if (action.type === 'chapters') {
                // For chapters, we need to know WHICH book if creating. The AI usually creates context-aware.
                // Simple logic: add to active book, or first book.
                const targetBookId = bookId || currentBooks[0]?.id;
                if (!targetBookId) return;

                if (action.action === 'create') {
                    const newChap: Chapter = { 
                        id: doc(collection(db, 'users')).id, 
                        title: action.data.title || 'New Chapter', 
                        content: action.data.content || '', 
                        outline: [], wordCount: 0 
                    };
                    const updatedBooks = currentBooks.map(b => b.id === targetBookId ? { ...b, chapters: [...b.chapters, newChap] } : b);
                    saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
                } else if (action.action === 'update' && action.id) {
                    const updatedBooks = currentBooks.map(b => ({
                        ...b,
                        chapters: b.chapters.map(c => c.id === action.id ? { ...c, ...action.data } : c)
                    }));
                    saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
                } else if (action.action === 'delete' && action.id) {
                    const updatedBooks = currentBooks.map(b => ({
                        ...b,
                        chapters: b.chapters.map(c => c.id === action.id ? { ...c, deletedAt: Date.now() } : c)
                    }));
                    saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
                }
            }
            return;
        }

        // Handling World Entities
        // Map common AI types to collection names if needed, though they usually align with prompt instructions
        const collectionName = action.type; // characters, items, etc.
        
        if (action.action === 'create') {
            const newId = doc(collection(db, 'users')).id;
            const newEntity = { ...action.data, id: newId, novelId: activeNovel.id };
            saveDocument(collectionName, newId, newEntity);
        } else if (action.action === 'update' && action.id) {
            // Fetch existing to merge? saveDocument merges if we spread, but Firestore setDoc overwrites if not merge:true.
            // Our saveDocument does setDoc. We should merge with existing data in state ideally or use updateDoc.
            // For simplicity in this context, we assume the AI sends partials and we might overwrite unless we merge manually.
            // Let's find current entity in worldData to be safe.
            const existing = (worldData as any)[collectionName]?.find((e:any) => e.id === action.id);
            if (existing) {
                saveDocument(collectionName, action.id, { ...existing, ...action.data });
            }
        } else if (action.action === 'delete' && action.id) {
            deleteDocument(collectionName, action.id);
        }
    };

    const handleLeftSidebarToggle = () => {
        setIsLeftSidebarOpen(!isLeftSidebarOpen);
        setIsRightSidebarOpen(false); 
    };

    const handleRightSidebarToggle = () => {
        setIsRightSidebarOpen(!isRightSidebarOpen);
        setIsLeftSidebarOpen(false); 
    };

    const handleBookSelect = (id: string) => {
        navigate(`/novel/${activeNovel?.id}/editor/${id}`);
    }

    const handleChapterSelect = (id: string) => {
        navigate(`/novel/${activeNovel?.id}/editor/${bookId}/${id}`);
        if (window.innerWidth < 768) {
            setIsLeftSidebarOpen(false);
        }
    }

    if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-primary text-white"><span className="animate-pulse">Loading Project...</span></div>;
    if (!activeNovel) return <div className="h-screen flex items-center justify-center bg-primary text-white">Project not found</div>;

    const totalWordCount = activeNovel.books?.reduce((acc, b) => acc + (b.chapters?.reduce((ca, c) => ca + (c.wordCount || 0), 0) || 0), 0) || 0;

    const handleConvertToScript = async (nId: string) => {
        if (!activeNovel || activeNovel.id !== nId) return;
        
        const confirm = window.confirm("This will create a NEW script version of your novel. It may take a moment. Continue?");
        if (!confirm) return;

        // 1. Create the new Novel object
        const scriptNovel: Novel = {
            id: doc(collection(db, 'users')).id,
            title: `${activeNovel.title} (Script)`,
            logline: activeNovel.logline || '',
            genre: activeNovel.genre || '',
            type: 'script',
            status: 'ongoing',
            books: [],
            writingHistory: {},
            dailyGoal: activeNovel.dailyGoal
        };

        // 2. Map books and chapters
        // We'll create the structure first, then the user can convert content in the editor
        // OR we can try to convert the first few chapters automatically.
        // For a better UX, let's create the structure and provide a "Convert All" utility or just do it now if small.
        
        const newBooks: Book[] = activeNovel.books.map(b => ({
            id: doc(collection(db, 'users')).id,
            title: b.title,
            chapters: b.chapters.map(c => ({
                ...c,
                id: doc(collection(db, 'users')).id,
                content: '<!-- Conversion Pending. Use the AI Format button in the editor to convert this chapter. -->'
            }))
        }));

        scriptNovel.books = newBooks;

        try {
            await saveDocument('novels', scriptNovel.id, scriptNovel);
            alert("Script version created! You can now find it in your projects list.");
            navigate(`/novel/${scriptNovel.id}/editor`);
        } catch (error) {
            console.error(error);
            alert("Failed to create script version.");
        }
    };

    const handleImportChapters = async (chapters: { title: string, content: string }[]) => {
        if (!activeNovel || !activeBook) return;
        
        const newChapters: Chapter[] = chapters.map(c => ({
            id: doc(collection(db, 'users')).id,
            title: c.title,
            content: c.content,
            outline: [],
            wordCount: c.content.split(/\s+/).length,
            versionHistory: []
        }));

        const updatedBooks = activeNovel.books.map(b => 
            b.id === activeBook.id 
                ? { ...b, chapters: [...b.chapters, ...newChapters] } 
                : b
        );

        try {
            await saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
            alert(`Imported ${chapters.length} chapters to ${activeBook.title}`);
        } catch (error) {
            console.error(error);
            alert("Failed to import chapters.");
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col font-sans bg-primary text-text-primary overflow-hidden">
            {/* Header */}
            {!isFocusMode && (
                <header className="flex-shrink-0 bg-secondary/80 backdrop-blur-md sticky top-0 border-b border-white/5 px-3 py-2 flex justify-between items-center z-20 h-14">
                    <div className="flex items-center gap-2 min-w-0">
                        <button onClick={handleLeftSidebarToggle} className="p-2 rounded-md hover:bg-white/5 text-text-secondary md:hidden"><MenuIcon /></button>
                        <button onClick={() => navigate('/')} className="text-base sm:text-lg font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent truncate tracking-tight hover:opacity-80">
                            &larr; <span className="hidden sm:inline">{activeNovel.title}</span><span className="sm:hidden">Home</span>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-2">
                            <button onClick={() => setIsSearchModalOpen(true)} className="p-2 rounded-md hover:bg-white/5 text-text-secondary"><SearchIcon/></button>
                            <div className="h-6 w-px bg-white/10 mx-1"></div>
                            <button onClick={() => handleNavigate(`editor/${activeBook?.id || ''}/${activeChapter?.id || ''}`)} title="Editor" className={`p-2 rounded-md ${isEditor ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><EditIcon /></button>
                            <button onClick={() => handleNavigate('corkboard')} title="Corkboard" className={`p-2 rounded-md ${viewMode === 'corkboard' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><PinIcon /></button>
                            <button onClick={() => setIsWorldManagerOpen(true)} title="World" className={`p-2 rounded-md ${viewMode === 'world' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><WorldIcon /></button>
                            <button onClick={() => handleNavigate('timeline')} title="Timeline" className={`p-2 rounded-md ${viewMode === 'timeline' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><TimelineIcon /></button>
                            <button onClick={() => handleNavigate('bin')} title="Bin" className={`p-2 rounded-md ${viewMode === 'bin' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><BinIcon /></button>
                            <button onClick={() => setIsFocusMode(true)} title="Focus" className="p-2 rounded-md text-text-secondary hover:bg-white/5"><FocusIcon /></button>
                        </div>

                        {/* Mobile Navigation Toggler */}
                        <div className="md:hidden flex items-center">
                             <button onClick={() => setIsSearchModalOpen(true)} className="p-2 rounded-md hover:bg-white/5 text-text-secondary"><SearchIcon/></button>
                             <button 
                                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} 
                                className={`p-2 rounded-md transition-colors ${isMobileNavOpen ? 'bg-white/10 text-white' : 'text-text-secondary'}`}
                             >
                                <span className="text-xl font-bold leading-none select-none transform rotate-90">⋮</span>
                             </button>
                        </div>

                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                        <button onClick={handleRightSidebarToggle} className={`p-2 rounded-md ${isRightSidebarOpen ? 'text-accent' : 'text-text-secondary'} hover:bg-white/5`}><BrainIcon /></button>
                    </div>

                    {/* Mobile Dropdown Menu */}
                    {isMobileNavOpen && (
                        <div className="absolute top-14 right-2 bg-secondary border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-48 z-30 animate-slide-in md:hidden">
                            <button onClick={() => handleNavigate(`editor/${activeBook?.id || ''}/${activeChapter?.id || ''}`)} className={`p-3 rounded-lg text-left text-sm flex items-center gap-3 ${isEditor ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><EditIcon /> Editor</button>
                            <button onClick={() => handleNavigate('corkboard')} className={`p-3 rounded-lg text-left text-sm flex items-center gap-3 ${viewMode === 'corkboard' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><PinIcon /> Corkboard</button>
                            <button onClick={() => { setIsWorldManagerOpen(true); setIsMobileNavOpen(false); }} className={`p-3 rounded-lg text-left text-sm flex items-center gap-3 text-text-secondary hover:bg-white/5`}><WorldIcon /> World Bible</button>
                            <button onClick={() => handleNavigate('timeline')} className={`p-3 rounded-lg text-left text-sm flex items-center gap-3 ${viewMode === 'timeline' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><TimelineIcon /> Timeline</button>
                            <button onClick={() => handleNavigate('bin')} className={`p-3 rounded-lg text-left text-sm flex items-center gap-3 ${viewMode === 'bin' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-white/5'}`}><BinIcon /> Bin</button>
                            <button onClick={() => { setIsFocusMode(true); setIsMobileNavOpen(false); }} className="p-3 rounded-lg text-left text-sm flex items-center gap-3 text-text-secondary hover:bg-white/5"><FocusIcon /> Focus Mode</button>
                        </div>
                    )}
                </header>
            )}

            <div className="flex flex-grow overflow-hidden relative">
                {/* Left Sidebar */}
                {!isFocusMode && (
                    <aside className={`absolute md:static inset-y-0 left-0 z-20 flex-shrink-0 bg-secondary border-r border-white/5 transition-transform duration-300 ease-in-out ${isLeftSidebarOpen ? 'translate-x-0 w-80 shadow-2xl' : '-translate-x-full md:translate-x-0 md:w-72 lg:w-80 md:shadow-none'} overflow-hidden`}>
                        {isLeftSidebarOpen && (
                             <button onClick={() => setIsLeftSidebarOpen(false)} className="md:hidden absolute top-2 right-2 p-2 bg-black/20 rounded-full text-white z-50"><CloseIcon /></button>
                        )}
                        <Sidebar 
                            novels={[activeNovel]} 
                            activeNovelId={activeNovel.id}
                            activeBookId={bookId || null}
                            activeChapterId={chapterId || null}
                            onNovelSelect={() => {}} 
                            onBookSelect={handleBookSelect}
                            onChapterSelect={handleChapterSelect}
                            onAddNovel={() => {}} 
                            onAddBook={handleAddBook}
                            onAddChapter={handleAddChapter}
                            activeNovel={activeNovel}
                            onUpdateNovelDetails={(id, d) => updateNovelDetails(id, d)}
                            onUpdateBookTitle={updateBookTitle}
                            onUpdateChapterTitle={updateChapterTitle}
                            onDeleteNovel={(id) => softDelete('novel', id)}
                            onDeleteBook={(id) => softDelete('book', id)}
                            onDeleteChapter={(id) => softDelete('chapter', id)}
                            onOpenSettings={() => setIsSettingsOpen(true)} 
                            onOpenImportExport={() => setIsImportExportOpen(true)} 
                            onConvertToScript={handleConvertToScript}
                        />
                    </aside>
                )}

                {/* Mobile Overlay Background */}
                {isLeftSidebarOpen && !isFocusMode && (
                    <div className="absolute inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm" onClick={() => setIsLeftSidebarOpen(false)}></div>
                )}

                {/* Main Content Area */}
                <main className="flex-grow flex flex-col overflow-hidden bg-primary relative z-0 w-full">
                    <ErrorBoundary fallback={<div className="flex-grow flex items-center justify-center p-8 text-center text-red-400 bg-primary"><div className="bg-secondary p-6 rounded-lg border border-red-500/20"><h2 className="text-xl font-bold mb-2">Editor Error</h2><p className="text-sm text-text-secondary">Something went wrong in this view. Please try refreshing or selecting a different chapter.</p></div></div>}>
                        <Outlet />
                    </ErrorBoundary>
                    
                    {isEditor && (
                        <StatusBar 
                            chapterWordCount={activeChapter?.wordCount || 0} 
                            totalWordCount={totalWordCount} 
                            lastSave={lastSave} 
                            saveStatus={saveStatus} 
                        />
                    )}
                </main>

                {/* Right Sidebar (Assistant) */}
                {!isFocusMode && (
                    <aside className={`absolute md:static inset-y-0 right-0 z-20 flex-shrink-0 bg-secondary border-l border-white/5 transition-transform duration-300 ease-in-out ${isRightSidebarOpen ? 'translate-x-0 w-80 shadow-2xl' : 'translate-x-full md:translate-x-full md:w-0'} overflow-hidden`}>
                         {isRightSidebarOpen && (
                             <div className="absolute top-0 left-0 w-full h-10 flex justify-end md:hidden p-2 pointer-events-none">
                                <button onClick={() => setIsRightSidebarOpen(false)} className="p-2 bg-black/40 rounded-full text-white pointer-events-auto"><CloseIcon /></button>
                             </div>
                        )}
                        <GeminiAssistant
                            activeChapter={activeChapter}
                            activeNovel={activeNovel}
                            activeBook={activeBook}
                            onAddChapters={handleAddChaptersBatch}
                            onAddCharacter={handleAddCharacter}
                            onExecuteAction={handleAIAction}
                            allCharacters={worldData.characters}
                            worldData={worldData}
                        />
                    </aside>
                )}
                
                 {/* Mobile Overlay Background for Right Sidebar */}
                 {isRightSidebarOpen && !isFocusMode && (
                    <div className="absolute inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm" onClick={() => setIsRightSidebarOpen(false)}></div>
                )}
            </div>

            {/* Modals & Focus Mode Exit */}
            {isFocusMode && (
                <button onClick={() => setIsFocusMode(false)} className="fixed bottom-6 right-6 z-50 bg-accent text-white rounded-full p-4 shadow-2xl hover:bg-sky-400 transition-transform hover:scale-105"><ExitFocusIcon /></button>
            )}

            <Settings 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                theme={theme}
                setTheme={setTheme}
                fontSize={fontSize}
                setFontSize={setFontSize}
                customTheme={customTheme}
                setCustomTheme={setCustomTheme}
            />

            <ImportExportModal
                isOpen={isImportExportOpen}
                onClose={() => setIsImportExportOpen(false)}
                activeNovel={activeNovel || undefined}
                onExportAllData={handleExportAllData}
                onImportAllData={() => {}} // Placeholder logic
                onAddWorldEntities={handleAddImportedEntities}
                onMigrateLegacyData={() => alert("No local legacy data found.")}
                onImportChapters={handleImportChapters}
            />

            <SearchModal 
                isOpen={isSearchModalOpen} 
                onClose={() => setIsSearchModalOpen(false)} 
                worldData={{
                    ...worldData,
                    chapters: activeNovel?.books?.flatMap(b => b.chapters?.map(c => ({...c, bookTitle: b.title, bookId: b.id})) || []) || []
                }}
                novelId={activeNovel?.id}
                onSelect={(entity) => {
                    if (entity.targetPath) {
                        navigate(entity.targetPath, { state: { highlightSnippet: entity.snippet } });
                        setIsSearchModalOpen(false);
                        return;
                    }

                    if (entity.__type === 'chapters') {
                        // Navigate to chapter
                        const chapter = entity as any;
                        // Find book id for this chapter
                        const book = activeNovel?.books?.find(b => b.chapters?.some(c => c.id === chapter.id));
                        if (book) {
                            navigate(`/novel/${activeNovel?.id}/editor/${book.id}/${chapter.id}`, { state: { highlightSnippet: entity.snippet } });
                            setIsSearchModalOpen(false);
                        }
                    } else {
                        const typeToTab: Record<string, string> = {
                            'characters': 'Characters',
                            'creatures': 'Creatures',
                            'regions': 'Regions',
                            'lores': 'Lore',
                            'events': 'Events',
                            'items': 'All Items',
                            'magicalThings': 'Magical Things',
                            'clans': 'Clans',
                            'dialogs': 'Dialogs',
                            'poems': 'Poems',
                            'quotes': 'Quotes'
                        };
                        const tabName = entity.__type === 'customEntities' ? (entity as CustomEntity).customTabName : (typeToTab[entity.__type] || entity.__type);
                        setWorldManagerTarget({ tab: tabName, id: entity.id });
                        setIsWorldManagerOpen(true);
                        setIsSearchModalOpen(false);
                    }
                }}
            />

            <WorldItemManager
                isOpen={isWorldManagerOpen}
                onClose={() => setIsWorldManagerOpen(false)}
                worldData={worldData as any}
                novelId={activeNovel.id}
                activeBook={activeBook}
                onSaveEntity={(entity, type) => {
                    const collectionMap: Record<string, string> = { 'Characters': 'characters', 'Regions': 'regions', 'Lore': 'lores', 'Events': 'events', 'All Items': 'items', 'Clans': 'clans', 'Creatures': 'creatures', 'Magical Things': 'magicalThings', 'Dialogs': 'dialogs' };
                    const colName = collectionMap[type] || 'customEntities';
                    // Must return Promise here for UI feedback
                    return saveDocument(colName, entity.id, entity);
                }}
                onDeleteEntity={(id, type) => {
                     const collectionMap: Record<string, string> = { 'Characters': 'characters', 'Regions': 'regions', 'Lore': 'lores', 'Events': 'events', 'All Items': 'items', 'Clans': 'clans', 'Creatures': 'creatures', 'Magical Things': 'magicalThings', 'Dialogs': 'dialogs' };
                     const colName = collectionMap[type] || 'customEntities';
                     deleteDocument(colName, id);
                }}
                initialTarget={worldManagerTarget}
                onTargetHandled={() => setWorldManagerTarget(null)}
            />
        </div>
    );
};

export default ProjectLayout;

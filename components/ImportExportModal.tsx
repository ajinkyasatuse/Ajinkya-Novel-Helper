
import React, { useState, useEffect } from 'react';
import { Novel, Character, Event, Lore, Region, Item, Clan, Creature, MagicalThing, AppBackup, Dialog } from '../types';
import { CloseIcon, LoaderIcon, SparklesIcon, DocxIcon, EpubIcon, SettingsIcon } from './Icons';
import { generateNovelPdf, extractTextFromPdf } from '../utils/pdfUtils';
import { generateDocx, generateEpub } from '../utils/exportUtils';
import * as geminiService from '../services/geminiService';

type WorldEntityImportData = Omit<Character, 'id' | 'novelId'> | Omit<Event, 'id' | 'novelId'> | Omit<Lore, 'id' | 'novelId'> | Omit<Region, 'id' | 'novelId'> | Omit<Item, 'id' | 'novelId'> | Omit<Clan, 'id' | 'novelId'> | Omit<Dialog, 'id' | 'novelId'>;
type WorldEntityImportType = 'characters' | 'events' | 'lores' | 'regions' | 'items' | 'clans' | 'dialogs';
type SelectedImportEntities = Record<WorldEntityImportType, Record<string, boolean>>;

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNovel: Novel | undefined;
  onExportAllData: () => AppBackup;
  onImportAllData: (data: AppBackup) => void;
  onAddWorldEntities: (entities: WorldEntityImportData[], type: WorldEntityImportType) => void;
  onMigrateLegacyData: () => void;
  onImportChapters: (chapters: { title: string, content: string }[]) => void;
}

type Status = 'idle' | 'processing' | 'error' | 'success';

interface AnalysisResults {
    characters: Omit<Character, 'id' | 'novelId'>[];
    events: Omit<Event, 'id' | 'novelId'>[];
    lores: Omit<Lore, 'id' | 'novelId'>[];
    regions: Omit<Region, 'id' | 'novelId'>[];
    items: Omit<Item, 'id' | 'novelId'>[];
    clans: Omit<Clan, 'id' | 'novelId'>[];
    dialogs: Omit<Dialog, 'id' | 'novelId'>[];
}

const Accordion: React.FC<{ 
    title: string, 
    count: number, 
    onToggleSelectAll: () => void,
    allSelected: boolean,
    children: React.ReactNode 
}> = ({ title, count, onToggleSelectAll, allSelected, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    if (count === 0) return null;

    return (
        <div className="border border-secondary rounded-md mb-2">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 bg-secondary hover:bg-slate-700 transition-colors rounded-t-md group">
                <span className="font-semibold text-sm flex items-center gap-2">
                    {title} 
                    <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-xs font-mono">{count}</span>
                </span>
                <span className={`transform transition-transform text-text-secondary ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isOpen && (
                <div className="p-3 bg-primary/20 rounded-b-md border-t border-white/5">
                    <div className="flex justify-end mb-2">
                        <button 
                            onClick={onToggleSelectAll} 
                            className="text-[10px] uppercase tracking-wider font-bold text-accent hover:text-white"
                        >
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    {children}
                </div>
            )}
        </div>
    )
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose, activeNovel, onExportAllData, onImportAllData, onAddWorldEntities, onMigrateLegacyData, onImportChapters }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // Export state
  const [exportContent, setExportContent] = useState<'manuscript' | 'bible' | 'both'>('manuscript');
  const [exportScope, setExportScope] = useState<'all' | 'book' | 'single' | 'chapters'>('all');
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [startChapterId, setStartChapterId] = useState<string | null>(null);
  const [endChapterId, setEndChapterId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [exportStatus, setExportStatus] = useState<Status>('idle');
  const [exportMessage, setExportMessage] = useState('');

  // Import state
  const [importSource, setImportSource] = useState<'pdf' | 'text'>('pdf');
  const [pdfImportFile, setPdfImportFile] = useState<File | null>(null);
  const [pdfImportStatus, setPdfImportStatus] = useState<Status>('idle');
  const [pdfImportMessage, setPdfImportMessage] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<SelectedImportEntities>({ characters: {}, events: {}, lores: {}, regions: {}, items: {}, clans: {}, dialogs: {} });
  
  // Advanced Import Settings
  const [showAdvancedImport, setShowAdvancedImport] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(geminiService.AI_MODELS.SMART);

  const resetAllState = () => {
    setExportContent('manuscript'); setExportScope('all'); setBookId(null); setChapterId(null); setStartChapterId(null); setEndChapterId(null); setExportStatus('idle'); setExportMessage('');
    setPdfImportFile(null); setPdfImportStatus('idle'); setPdfImportMessage(''); setExtractedText(''); setAnalysisResults(null); setSelectedEntities({ characters: {}, events: {}, lores: {}, regions: {}, items: {}, clans: {}, dialogs: {} });
    setCustomApiKey(''); setSelectedModel(geminiService.AI_MODELS.SMART); setImportSource('pdf'); setShowAdvancedImport(false);
  }

  const handleClose = () => {
    resetAllState();
    onClose();
  }

  useEffect(() => {
    if (isOpen) {
        if (activeNovel && activeNovel.books.length > 0) {
            setBookId(activeNovel.books[0].id);
        } else {
            setBookId(null);
        }
        setExportScope('all');
    }
  }, [isOpen, activeNovel]);

  useEffect(() => {
    const book = activeNovel?.books.find(b => b.id === bookId);
    if (book && book.chapters.length > 0) {
        setChapterId(book.chapters[0].id);
        setStartChapterId(book.chapters[0].id);
        setEndChapterId(book.chapters[book.chapters.length - 1].id);
    } else {
        setChapterId(null);
        setStartChapterId(null);
        setEndChapterId(null);
    }
  }, [bookId, activeNovel]);

  const handleExport = async (format: 'pdf' | 'docx' | 'epub') => {
    if (!activeNovel) return;
    setExportStatus('processing');
    setExportMessage(`Generating ${format.toUpperCase()}...`);
    try {
        const fullData = onExportAllData();
        const worldData = {
            characters: fullData.characters.filter(x => x.novelId === activeNovel.id),
            regions: fullData.regions.filter(x => x.novelId === activeNovel.id),
            lores: fullData.lores.filter(x => x.novelId === activeNovel.id),
            events: fullData.events.filter(x => x.novelId === activeNovel.id),
            items: fullData.items.filter(x => x.novelId === activeNovel.id),
            clans: fullData.clans.filter(x => x.novelId === activeNovel.id),
            creatures: fullData.creatures.filter(x => x.novelId === activeNovel.id),
            magicalThings: fullData.magicalThings.filter(x => x.novelId === activeNovel.id),
        };

        const options: any = { 
            type: exportScope,
            content: exportContent,
            worldData: worldData,
            pageSize: pageSize,
            includePageNumbers: includePageNumbers,
            includeTitlePage: true,
            includeBookTitles: true,
            includeChapterTitles: true
        };
        
        if (exportScope === 'book') options.bookId = bookId;
        else if (exportScope === 'single') {
             options.type = 'chapters'; 
             options.bookId = bookId;
             options.startChapterId = chapterId;
             options.endChapterId = chapterId;
        } else if (exportScope === 'chapters') {
            options.bookId = bookId;
            options.startChapterId = startChapterId;
            options.endChapterId = endChapterId;
        }

        if (format === 'pdf') await generateNovelPdf(activeNovel, options);
        if (format === 'docx') await generateDocx(activeNovel, options);
        if (format === 'epub') await generateEpub(activeNovel, options);

        setExportStatus('success');
        setExportMessage(`${format.toUpperCase()} generated successfully!`);
        setTimeout(() => { setExportStatus('idle'); setExportMessage(''); }, 3000);
    } catch (e) {
        console.error(`${format} Export failed`, e);
        setExportStatus('error');
        setExportMessage(`Error generating ${format.toUpperCase()}.`);
    }
  };
  
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPdfImportFile(file);
    setExtractedText('');
    setAnalysisResults(null);
    setPdfImportMessage('Extracting text from PDF...');
    setPdfImportStatus('processing');
    
    try {
        const text = await extractTextFromPdf(file);
        setExtractedText(text);
        setPdfImportMessage('Text extracted successfully. Ready to analyze.');
        setPdfImportStatus('idle');
    } catch (err: any) {
        console.error("PDF Extraction Failed", err);
        setPdfImportMessage(`Error extracting text: ${err.message}. Please refresh the page and try again.`);
        setPdfImportStatus('error');
    }
  };
  
  const handleAnalyzeText = async () => {
    if (!extractedText) return;
    setPdfImportMessage('AI is Thinking... This may take a moment to extract all entities.');
    setPdfImportStatus('processing');
    try {
        // Pass custom API Key override if provided
        const apiKeyToUse = customApiKey.trim() || undefined;
        const results = await geminiService.analyzePdfForWorldBuilding(extractedText, apiKeyToUse, selectedModel);
        setAnalysisResults(results);
        
        const initialSelections: SelectedImportEntities = { characters: {}, events: {}, lores: {}, regions: {}, items: {}, clans: {}, dialogs: {} };
        results.characters.forEach(c => initialSelections.characters[c.name] = true);
        results.events.forEach(e => initialSelections.events[e.name] = true);
        results.lores.forEach(l => initialSelections.lores[l.name] = true);
        results.regions.forEach(r => initialSelections.regions[r.name] = true);
        results.items.forEach(i => initialSelections.items[i.name] = true);
        results.clans.forEach(c => initialSelections.clans[c.name] = true);
        results.dialogs.forEach((d, idx) => initialSelections.dialogs[`dialog-${idx}`] = true);

        setSelectedEntities(initialSelections);
        setPdfImportMessage('Analysis Complete! Review and import entities below.');
        setPdfImportStatus('success');
    } catch (err: any) {
        console.error(err);
        setPdfImportMessage(`Analysis failed: ${err.message}`);
        setPdfImportStatus('error');
    }
  };

  const handleImportAsChapters = async () => {
    if (!extractedText) return;
    setPdfImportMessage('AI is splitting text into chapters...');
    setPdfImportStatus('processing');
    try {
        const chapters = await geminiService.splitTextIntoChapters(extractedText, selectedModel);
        if (chapters.length > 0) {
            onImportChapters(chapters);
            setPdfImportMessage(`Successfully imported ${chapters.length} chapters!`);
            setPdfImportStatus('success');
        } else {
            setPdfImportMessage('Failed to split text into chapters.');
            setPdfImportStatus('error');
        }
    } catch (err: any) {
        console.error(err);
        setPdfImportMessage(`Import failed: ${err.message}`);
        setPdfImportStatus('error');
    }
  };
  
  const handleEntitySelectionChange = (type: WorldEntityImportType, name: string) => {
    setSelectedEntities(prev => ({
        ...prev,
        [type]: { ...prev[type], [name]: !prev[type][name] }
    }));
  };

  const handleToggleSelectAll = (type: WorldEntityImportType, allItems: any[]) => {
      const isDialog = type === 'dialogs';
      const getKey = (item: any, idx: number) => isDialog ? `dialog-${idx}` : item.name;
      const allSelected = allItems.every((i, idx) => selectedEntities[type][getKey(i, idx)]);
      const newSelectionState = !allSelected;
      const newTypeSelections: Record<string, boolean> = {};
      allItems.forEach((i, idx) => { newTypeSelections[getKey(i, idx)] = newSelectionState; });
      setSelectedEntities(prev => ({ ...prev, [type]: newTypeSelections }));
  };

  const handleAddSelectedEntities = () => {
    if (!analysisResults) return;
    
    const mapCategory = (items: any[]) => items.map(i => ({...i, category: i.group || i.category }));

    const charactersToAdd = mapCategory(analysisResults.characters.filter(c => selectedEntities.characters[c.name]));
    const eventsToAdd = mapCategory(analysisResults.events.filter(e => selectedEntities.events[e.name]));
    const loresToAdd = mapCategory(analysisResults.lores.filter(l => selectedEntities.lores[l.name]));
    const regionsToAdd = mapCategory(analysisResults.regions.filter(r => selectedEntities.regions[r.name]));
    const itemsToAdd = mapCategory(analysisResults.items.filter(i => selectedEntities.items[i.name]));
    const clansToAdd = mapCategory(analysisResults.clans.filter(c => selectedEntities.clans[c.name]));
    
    // Dialog Handling specifically for matching speakers to existing characters
    const appData = onExportAllData();
    const existingChars = appData.characters.filter(c => c.novelId === activeNovel?.id);
    const findCharId = (name: string) => {
        const normalized = name.toLowerCase();
        const existing = existingChars.find(c => c.name.toLowerCase() === normalized);
        if (existing) return existing.id;
        const beingImported = charactersToAdd.find(c => c.name.toLowerCase() === normalized);
        // Note: we can't link to beingImported yet as they don't have IDs, so we skip for now or create loose link
        return undefined;
    };

    const dialogsToAdd = analysisResults.dialogs
        .filter((d, idx) => selectedEntities.dialogs[`dialog-${idx}`])
        .map(d => ({
            name: `${(d as any).speakerName}: "${d.content.substring(0, 15)}..."`, 
            description: d.content, 
            content: d.content,
            context: d.context,
            speakerId: findCharId((d as any).speakerName),
            category: 'Imported Dialogs'
        }));

    if (charactersToAdd.length > 0) onAddWorldEntities(charactersToAdd, 'characters');
    if (eventsToAdd.length > 0) onAddWorldEntities(eventsToAdd, 'events');
    if (loresToAdd.length > 0) onAddWorldEntities(loresToAdd, 'lores');
    if (regionsToAdd.length > 0) onAddWorldEntities(regionsToAdd, 'regions');
    if (itemsToAdd.length > 0) onAddWorldEntities(itemsToAdd, 'items');
    if (clansToAdd.length > 0) onAddWorldEntities(clansToAdd, 'clans');
    if (dialogsToAdd.length > 0) onAddWorldEntities(dialogsToAdd as any, 'dialogs' as any);

    const total = charactersToAdd.length + eventsToAdd.length + loresToAdd.length + regionsToAdd.length + itemsToAdd.length + clansToAdd.length + dialogsToAdd.length;
    setPdfImportMessage(`Successfully imported ${total} entities!`);
    setAnalysisResults(null); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <header className="flex justify-between items-center p-4 border-b border-secondary">
          <h2 className="text-xl font-bold">Import / Export</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-secondary"><CloseIcon /></button>
        </header>
        
        <div className="flex-shrink-0 border-b border-secondary">
            <nav className="flex space-x-1 px-4 overflow-x-auto">
                <button onClick={() => setActiveTab('export')} className={`py-2 px-3 font-medium text-sm whitespace-nowrap ${activeTab === 'export' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary hover:text-text-primary'}`}>Export Data</button>
                <button onClick={() => setActiveTab('import')} className={`py-2 px-3 font-medium text-sm whitespace-nowrap ${activeTab === 'import' ? 'border-b-2 border-accent text-accent' : 'text-text-secondary hover:text-text-primary'}`}>Import Data</button>
            </nav>
        </div>

        <main className="p-6 overflow-y-auto custom-scrollbar">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Export Options</h3>
              <fieldset disabled={!activeNovel || exportStatus === 'processing'} className="space-y-4">
                  <div className="bg-secondary/30 p-3 rounded-md border border-white/5">
                      <legend className="text-sm font-medium text-text-primary mb-2 block">Content to Export</legend>
                      <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="exportContent" value="manuscript" checked={exportContent === 'manuscript'} onChange={() => setExportContent('manuscript')} className="text-accent" /><span className="text-sm">Manuscript Only</span></label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="exportContent" value="bible" checked={exportContent === 'bible'} onChange={() => setExportContent('bible')} className="text-accent" /><span className="text-sm">World Bible Only</span></label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="exportContent" value="both" checked={exportContent === 'both'} onChange={() => setExportContent('both')} className="text-accent" /><span className="text-sm">Combined</span></label>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => handleExport('pdf')} className="w-full bg-red-600 text-white p-3 rounded-md hover:bg-red-500 font-semibold flex items-center justify-center gap-2 disabled:bg-slate-500">{exportStatus === 'processing' ? <LoaderIcon /> : "PDF"}</button>
                      <button onClick={() => handleExport('docx')} className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-500 font-semibold flex items-center justify-center gap-2 disabled:bg-slate-500">{exportStatus === 'processing' ? <LoaderIcon /> : <><DocxIcon /> DOCX</>}</button>
                      <button onClick={() => handleExport('epub')} className="w-full bg-yellow-600 text-white p-3 rounded-md hover:bg-yellow-500 font-semibold flex items-center justify-center gap-2 disabled:bg-slate-500">{exportStatus === 'processing' ? <LoaderIcon /> : <><EpubIcon /> EPUB</>}</button>
                  </div>
              </fieldset>
              {exportMessage && <div className={`text-sm text-center p-2 rounded ${exportStatus === 'error' ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}>{exportMessage}</div>}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
                <div className="border-t border-slate-600 pt-4">
                    <h3 className="text-lg font-semibold mb-2">Import & Analysis</h3>
                    {!analysisResults && (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-text-secondary mb-1">Source</label>
                                <div className="flex gap-4 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={importSource === 'pdf'} onChange={() => setImportSource('pdf')} /> PDF</label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={importSource === 'text'} onChange={() => setImportSource('text')} /> Text</label>
                                </div>
                                {importSource === 'pdf' ? (
                                    <input type="file" accept=".pdf" onChange={handlePdfFileChange} disabled={pdfImportStatus === 'processing' || !activeNovel} className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-accent file:text-white"/>
                                ) : (
                                    <textarea value={extractedText} onChange={(e) => setExtractedText(e.target.value)} rows={5} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-xs" placeholder="Paste text here..."/>
                                )}
                            </div>
                            
                            <div className="mb-4 bg-secondary/20 p-3 rounded border border-white/5">
                                <button onClick={() => setShowAdvancedImport(!showAdvancedImport)} className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 w-full text-left">
                                    <SettingsIcon /> Advanced Settings {showAdvancedImport ? '(-)' : '(+)'}
                                </button>
                                
                                {showAdvancedImport && (
                                    <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">Custom API Key (Override)</label>
                                            <input 
                                                type="password" 
                                                value={customApiKey} 
                                                onChange={(e) => setCustomApiKey(e.target.value)} 
                                                placeholder="Defaults to Global Settings Key"
                                                className="w-full bg-primary border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">AI Model</label>
                                            <select 
                                                value={selectedModel} 
                                                onChange={(e) => setSelectedModel(e.target.value)}
                                                className="w-full bg-primary border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                            >
                                                <option value={geminiService.AI_MODELS.SMART}>Gemini 3 Pro Preview (Best Analysis)</option>
                                                <option value={geminiService.AI_MODELS.FAST}>Gemini 3 Flash Preview (Fast)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={handleAnalyzeText} disabled={!extractedText || pdfImportStatus === 'processing'} className="flex-1 bg-accent text-white p-2 rounded-md hover:bg-sky-400 font-semibold flex items-center justify-center disabled:bg-slate-500 disabled:cursor-not-allowed">
                                    {pdfImportStatus === 'processing' ? <><LoaderIcon /> Analyzing...</> : <><SparklesIcon /> Analyze World</>}
                                </button>
                                <button onClick={handleImportAsChapters} disabled={!extractedText || pdfImportStatus === 'processing'} className="flex-1 bg-secondary text-white p-2 rounded-md hover:bg-white/10 font-semibold flex items-center justify-center border border-white/10 disabled:opacity-50">
                                    Import as Chapters
                                </button>
                            </div>
                            {pdfImportMessage && <p className={`text-sm mt-2 ${pdfImportStatus === 'error' ? 'text-red-400 bg-red-500/10 p-2 rounded' : 'text-accent'}`}>{pdfImportMessage}</p>}
                        </>
                    )}
                    
                    {analysisResults && (
                        <div className="space-y-4">
                            <p className="text-sm text-text-secondary">AI Analysis Complete. Select items to import:</p>
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                <Accordion title="Characters" count={analysisResults.characters.length} onToggleSelectAll={() => handleToggleSelectAll('characters', analysisResults!.characters)} allSelected={analysisResults.characters.every(c => selectedEntities.characters[c.name])}>
                                    <ul className="space-y-2">{analysisResults.characters.map(item => <li key={item.name} className="text-sm p-3 bg-primary rounded border border-white/5"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={selectedEntities.characters[item.name] ?? false} onChange={() => handleEntitySelectionChange('characters', item.name)} className="mt-1.5 accent-accent"/><div className="flex-grow"><strong className="font-semibold text-accent">{item.name}</strong><p className="text-xs text-text-secondary">{item.description}</p></div></label></li>)}</ul>
                                </Accordion>
                                <Accordion title="Locations" count={analysisResults.regions.length} onToggleSelectAll={() => handleToggleSelectAll('regions', analysisResults!.regions)} allSelected={analysisResults.regions.every(r => selectedEntities.regions[r.name])}>
                                    <ul className="space-y-2">{analysisResults.regions.map(item => <li key={item.name} className="text-sm p-3 bg-primary rounded border border-white/5"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={selectedEntities.regions[item.name] ?? false} onChange={() => handleEntitySelectionChange('regions', item.name)} className="mt-1.5 accent-green-500"/><div><strong className="text-green-400">{item.name}</strong><p className="text-xs">{item.description}</p></div></label></li>)}</ul>
                                </Accordion>
                                {/* Add other accordions similarly if needed */}
                            </div>
                            <button onClick={handleAddSelectedEntities} className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-500 font-semibold shadow-lg shadow-green-500/20">Import Selected</button>
                        </div>
                    )}
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ImportExportModal;


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorldEntityType, Book, StoryArc, TimelineNode, PlotThread } from '../types';
import { UserIcon, GlobeIcon, CalendarIcon, ScrollIcon, DragonIcon, LoaderIcon, SparklesIcon, PlusIcon, CloseIcon, SearchIcon, BookIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import GlobalSearch from './GlobalSearch';

// --- Types ---
type WorldData = {
    characters: any[];
    regions: any[];
    lores: any[];
    events: any[];
    items: any[];
    clans: any[];
    creatures: any[];
    magicalThings: any[];
    dialogs: any[];
    customEntities: any[];
    [key: string]: any; 
};

interface MagicTimelineProps {
    worldData: WorldData;
    activeNovelId: string | null;
    activeBook: Book | undefined;
    onUpdateEntity: (entity: WorldEntityType, type: string) => void;
}

const MagicTimeline: React.FC<MagicTimelineProps> = ({ worldData, activeNovelId, activeBook, onUpdateEntity }) => {
    // --- State ---
    const [arcs, setArcs] = useState<StoryArc[]>([
        { id: 'arc-1', title: 'Main Plot', nodes: [], threads: [{ id: 'thread-1', name: 'Main', color: 'bg-blue-500' }] }
    ]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [showRecommendations, setShowRecommendations] = useState(false);

    // --- Helpers ---
    const getNodeColor = (type: string) => {
        switch(type) {
            case 'characters': return 'bg-sky-400';
            case 'regions': return 'bg-emerald-400';
            case 'events': return 'bg-red-400';
            case 'chapters': return 'bg-indigo-500';
            default: return 'bg-slate-400';
        }
    };

    // --- AI Recommendation Handler ---
    const handleGetRecommendations = async () => {
        if (!activeBook) return;
        setIsAiLoading(true);
        setShowRecommendations(true);
        
        // Gather context
        const currentChapter = activeBook.chapters[activeBook.chapters.length - 1]; // Last chapter as context
        const text = currentChapter ? currentChapter.content : "";

        try {
            const suggestions = await geminiService.generateTimelineRecommendations(
                text,
                worldData,
                arcs
            );
            setRecommendations(suggestions);
        } catch (e) {
            console.error(e);
            alert("Failed to generate recommendations.");
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Render ---
    return (
        <div className="w-full h-full bg-slate-900 text-white overflow-hidden flex flex-col relative">
            
            {/* Header / Toolbar */}
            <div className="h-14 bg-slate-800 border-b border-white/10 flex items-center justify-between px-4">
                <h2 className="font-bold text-lg tracking-wide">Timeline & Arcs</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleGetRecommendations}
                        disabled={isAiLoading}
                        className="bg-accent hover:bg-sky-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isAiLoading ? <LoaderIcon /> : <SparklesIcon />}
                        <span>AI Forecast</span>
                    </button>
                </div>
            </div>

            {/* Main Canvas (Swimlanes) */}
            <div className="flex-1 overflow-auto p-8 relative custom-scrollbar">
                {/* Background Grid Lines (Optional) */}
                <div className="absolute inset-0 pointer-events-none opacity-10" 
                     style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px)', backgroundSize: '100px 100%' }}>
                </div>

                <div className="flex flex-col gap-8 min-w-[800px]">
                    {arcs.map(arc => (
                        <div key={arc.id} className="bg-slate-800/50 rounded-xl border border-white/5 p-4 relative">
                            {/* Arc Header */}
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-bold text-indigo-300 uppercase tracking-wider text-sm">{arc.title}</h3>
                                <button className="text-xs text-slate-400 hover:text-white">+ Add Thread</button>
                            </div>

                            {/* Swimlanes (Threads) */}
                            <div className="flex flex-col gap-4">
                                {arc.threads?.map(thread => (
                                    <div key={thread.id} className="relative min-h-[100px] flex items-center bg-slate-900/50 rounded-lg border border-white/5 px-4 py-2">
                                        {/* Thread Label */}
                                        <div className="absolute left-0 -top-3 bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 border border-white/10">
                                            {thread.name}
                                        </div>

                                        {/* Thread Line */}
                                        <div className={`absolute left-0 right-0 h-0.5 ${thread.color} opacity-20 top-1/2 transform -translate-y-1/2 pointer-events-none`}></div>

                                        {/* Nodes in this thread (Mock Data for Visualization) */}
                                        {/* In real implementation, filter arc.nodes by threadId */}
                                        <div className="flex gap-12 items-center z-10 ml-8">
                                            {/* Example Node */}
                                            <div className="group relative cursor-pointer">
                                                <div className={`w-4 h-4 rounded-full ${thread.color} border-2 border-slate-900 shadow-lg group-hover:scale-125 transition-transform`}></div>
                                                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    Inciting Incident
                                                </div>
                                            </div>
                                            
                                            {/* Connection Line Example (SVG would go here for complex curves) */}
                                            
                                            <div className="group relative cursor-pointer">
                                                <div className={`w-6 h-6 rounded bg-slate-700 border border-white/20 flex items-center justify-center shadow-lg group-hover:border-white transition-colors`}>
                                                    <span className="text-[10px]">CH1</span>
                                                </div>
                                            </div>

                                            <div className="group relative cursor-pointer">
                                                <div className={`w-4 h-4 rounded-full ${thread.color} border-2 border-slate-900 shadow-lg group-hover:scale-125 transition-transform`}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {/* Add Arc Button */}
                    <button 
                        onClick={() => setArcs([...arcs, { id: `arc-${Date.now()}`, title: 'New Arc', nodes: [], threads: [{ id: `t-${Date.now()}`, name: 'Main', color: 'bg-emerald-500' }] }])}
                        className="self-start border border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-white/40 transition-all w-full"
                    >
                        <PlusIcon />
                        <span className="mt-2 text-sm font-medium">Create New Story Arc</span>
                    </button>
                </div>
            </div>

            {/* AI Recommendations Modal / Drawer */}
            {showRecommendations && (
                <div className="absolute right-0 top-14 bottom-0 w-80 bg-slate-800 border-l border-white/10 shadow-2xl p-4 overflow-y-auto z-20 animate-in slide-in-from-right duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <SparklesIcon /> AI Forecast
                        </h3>
                        <button onClick={() => setShowRecommendations(false)} className="text-slate-400 hover:text-white"><CloseIcon /></button>
                    </div>

                    {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                            <LoaderIcon />
                            <span className="text-xs animate-pulse">Analyzing timelines...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {recommendations.map((rec, idx) => (
                                <div key={idx} className="bg-slate-700/50 p-3 rounded-lg border border-white/5 hover:border-accent/50 transition-colors group">
                                    <h4 className="font-bold text-indigo-300 text-sm mb-1">{rec.title}</h4>
                                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">{rec.description}</p>
                                    <div className="text-[10px] text-slate-500 italic border-t border-white/5 pt-2 mt-2">
                                        Why: {rec.reasoning}
                                    </div>
                                    <button className="mt-3 w-full bg-white/5 hover:bg-accent text-xs py-1.5 rounded transition-colors text-slate-300 hover:text-white">
                                        Add to Timeline
                                    </button>
                                </div>
                            ))}
                            {recommendations.length === 0 && (
                                <p className="text-xs text-slate-500 text-center">No recommendations generated.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MagicTimeline;


import React, { useState, useEffect } from 'react';
import { Chapter, Book, Novel } from '../types';
import { LoaderIcon, SparklesIcon, PlusIcon } from './Icons';
import * as geminiService from '../services/geminiService';

interface CorkboardProps {
    book: Book | undefined;
    novel: Novel | undefined;
    onUpdateChapters: (bookId: string, chapters: Chapter[]) => void;
    onSelectChapter: (id: string) => void;
}

const TensionGraph: React.FC<{ chapters: Chapter[] }> = ({ chapters }) => {
    const dataPoints = chapters.map(c => ({
        id: c.id,
        title: c.title,
        tension: c.tensionScore || 0,
        sentiment: c.sentimentScore || 0
    }));

    if (dataPoints.length === 0) return null;

    const width = 800;
    const height = 150;
    const padding = 20;
    const xStep = (width - padding * 2) / Math.max(1, dataPoints.length - 1);

    // Generate Path for Tension
    const points = dataPoints.map((pt, i) => {
        const x = padding + i * xStep;
        // Map tension 0-10 to height (inverted y)
        const y = height - padding - (pt.tension / 10) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="bg-secondary/50 rounded-xl p-4 border border-white/5 mb-6 overflow-x-auto">
            <h3 className="text-xs font-bold uppercase text-text-secondary mb-2 flex justify-between">
                <span>Story Arc (Tension Level)</span>
                <span className="text-accent text-[10px]">High points = Climax/Suspense</span>
            </h3>
            <div className="min-w-[600px] h-[160px] relative">
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="1" strokeDasharray="4" />
                    
                    {/* Tension Line */}
                    <polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Data Points */}
                    {dataPoints.map((pt, i) => {
                        const x = padding + i * xStep;
                        const y = height - padding - (pt.tension / 10) * (height - padding * 2);
                        const color = pt.sentiment > 0 ? '#4ade80' : pt.sentiment < 0 ? '#f87171' : '#94a3b8';
                        
                        return (
                            <g key={pt.id} className="group cursor-pointer">
                                <circle cx={x} cy={y} r="4" fill={color} stroke="#1e293b" strokeWidth="2" className="transition-all group-hover:r-6" />
                                {/* Tooltip */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <rect x={x - 60} y={y - 45} width="120" height="35" rx="4" fill="#1e293b" fillOpacity="0.9" />
                                    <text x={x} y={y - 25} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{pt.title.substring(0, 15)}...</text>
                                    <text x={x} y={y - 13} textAnchor="middle" fill="#cbd5e1" fontSize="9">T: {pt.tension}/10 | S: {pt.sentiment}</text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

const Corkboard: React.FC<CorkboardProps> = ({ book, novel, onUpdateChapters, onSelectChapter }) => {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (book) setChapters(book.chapters.filter(c => !c.deletedAt));
    }, [book]);

    const handleAnalyzeArc = async () => {
        if (!book || chapters.length === 0) return;
        setIsAnalyzing(true);
        
        try {
            const updatedChapters = [...chapters];
            for (let i = 0; i < updatedChapters.length; i++) {
                const chapter = updatedChapters[i];
                // Only analyze if content exists and scores are missing or outdated (simple check)
                if (chapter.content && (chapter.tensionScore === undefined)) {
                    const result = await geminiService.analyzeChapterTension(chapter.content);
                    updatedChapters[i] = { ...chapter, tensionScore: result.tension, sentimentScore: result.sentiment };
                }
            }
            // Update local and parent
            setChapters(updatedChapters);
            onUpdateChapters(book.id, updatedChapters); // Persist
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = "move";
        // Ghost image styling often handled by browser, but we set data for drop
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        const draggedIdx = parseInt(e.dataTransfer.getData("text/plain"));
        if (draggedIdx === index) return;

        const newChapters = [...chapters];
        const [movedItem] = newChapters.splice(draggedIdx, 1);
        newChapters.splice(index, 0, movedItem);

        setChapters(newChapters);
        if (book) onUpdateChapters(book.id, newChapters);
        setDraggedItem(null);
    };

    if (!book) return <div className="flex items-center justify-center h-full text-text-secondary">Select a book to view the corkboard.</div>;

    return (
        <div className="h-full bg-primary overflow-y-auto p-8 relative bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] bg-repeat">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6 bg-primary/80 backdrop-blur p-4 rounded-xl shadow-lg border border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{book.title} - Corkboard</h2>
                        <p className="text-xs text-text-secondary">{chapters.length} Cards</p>
                    </div>
                    <button 
                        onClick={handleAnalyzeArc} 
                        disabled={isAnalyzing}
                        className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-sky-400 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                        {isAnalyzing ? <LoaderIcon /> : <SparklesIcon />}
                        Analyze Story Arc
                    </button>
                </div>

                <TensionGraph chapters={chapters} />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {chapters.map((chapter, index) => (
                        <div
                            key={chapter.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onClick={() => onSelectChapter(chapter.id)}
                            className="bg-[#fefce8] text-slate-800 p-4 rounded shadow-xl min-h-[200px] flex flex-col transform hover:rotate-1 hover:scale-105 transition-all cursor-move relative group border-t-4 border-yellow-200"
                        >
                            <div className="flex justify-between items-start mb-2 border-b border-slate-300 pb-2">
                                <span className="font-bold text-sm uppercase tracking-wide">#{index + 1}</span>
                                {chapter.tensionScore !== undefined && (
                                    <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono" title="Tension Level">
                                        T:{chapter.tensionScore}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-lg mb-2 leading-tight">{chapter.title}</h3>
                            <p className="text-xs text-slate-600 line-clamp-4 flex-grow font-serif">
                                {chapter.content.replace(/<[^>]+>/g, '').substring(0, 150)}...
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
                                <span>{chapter.wordCount} words</span>
                                <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-bold uppercase">Open &rarr;</span>
                            </div>
                            
                            {/* Pin visual */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border border-red-700"></div>
                        </div>
                    ))}
                    
                    {/* Add New Card Placeholder */}
                    <div className="border-2 border-dashed border-white/20 rounded flex items-center justify-center min-h-[200px] text-text-secondary hover:text-white hover:border-white/40 cursor-pointer transition-colors bg-white/5">
                        <div className="flex flex-col items-center gap-2">
                            <PlusIcon />
                            <span className="text-sm font-semibold">Add Chapter</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Corkboard;

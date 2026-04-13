import React, { useState } from 'react';
import { StoryArc, TimelineNode, Character } from '../types';
import { UserIcon, CalendarIcon, DragonIcon, ScrollIcon } from './Icons';

interface TimelineThreadBoardProps {
    arcs: StoryArc[];
    characters: Character[];
    onNodeClick: (node: TimelineNode) => void;
}

const TimelineThreadBoard: React.FC<TimelineThreadBoardProps> = ({ arcs, characters, onNodeClick }) => {
    const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);

    // Helper to find characters involved in a node
    const getInvolvedCharacters = (node: TimelineNode) => {
        return characters.filter(c => node.characterIds?.includes(c.id));
    };

    return (
        <div className="w-full overflow-x-auto bg-slate-900 p-8 custom-scrollbar min-h-[500px]">
            <div className="flex flex-col gap-12 min-w-[1200px]">
                {arcs.map(arc => (
                    <div key={arc.id} className="relative bg-slate-800/40 rounded-2xl border border-white/5 p-6 shadow-xl">
                        {/* Arc Header */}
                        <div className="absolute -top-4 left-6 bg-slate-900 px-4 py-1 rounded-full border border-indigo-500/30 text-indigo-300 font-bold text-sm tracking-wider shadow-lg z-10">
                            {arc.title}
                        </div>

                        {/* Arc Description */}
                        {arc.description && (
                            <p className="text-xs text-slate-500 mb-6 ml-2 italic max-w-2xl">{arc.description}</p>
                        )}

                        {/* Timeline Track */}
                        <div className="relative flex items-center gap-16 py-8 px-4">
                            {/* Central Line */}
                            <div className="absolute left-0 right-0 h-1 bg-slate-700 rounded-full top-1/2 transform -translate-y-1/2 z-0"></div>

                            {/* Nodes */}
                            {arc.nodes.map((node, idx) => {
                                const isSelected = selectedNode?.id === node.id;
                                const involvedChars = getInvolvedCharacters(node);

                                return (
                                    <div key={node.id} className="relative group z-10 flex flex-col items-center">
                                        {/* Date Label (Above) */}
                                        {node.date && (
                                            <div className="absolute -top-10 text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                {node.date}
                                            </div>
                                        )}

                                        {/* Node Circle */}
                                        <button 
                                            onClick={() => {
                                                setSelectedNode(node);
                                                onNodeClick(node);
                                            }}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all shadow-lg ${
                                                isSelected 
                                                ? 'bg-indigo-600 border-white scale-110 shadow-indigo-500/50' 
                                                : 'bg-slate-800 border-slate-600 hover:border-indigo-400 hover:scale-105'
                                            }`}
                                        >
                                            {node.type === 'event' && <CalendarIcon className="w-5 h-5 text-white" />}
                                            {node.type === 'scene' && <ScrollIcon className="w-5 h-5 text-emerald-400" />}
                                            {node.type === 'milestone' && <DragonIcon className="w-5 h-5 text-amber-400" />}
                                        </button>

                                        {/* Title Label (Below) */}
                                        <div className={`mt-3 text-xs font-medium text-center max-w-[120px] transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-indigo-300'}`}>
                                            {node.title}
                                        </div>

                                        {/* Lore Links (SVG Lines to Characters) */}
                                        {isSelected && involvedChars.length > 0 && (
                                            <div className="absolute top-1/2 left-1/2 w-0 h-0 overflow-visible pointer-events-none">
                                                {involvedChars.map((char, i) => (
                                                    // This is a simplified visual representation. 
                                                    // In a real app, you'd calculate exact coordinates to character avatars.
                                                    <div key={char.id} 
                                                         className="absolute w-32 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent transform origin-left"
                                                         style={{ transform: `rotate(${45 + (i * 30)}deg)` }}
                                                    >
                                                        <div className="absolute right-0 -top-3 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-indigo-500/30 shadow-lg">
                                                            <UserIcon className="w-3 h-3 text-sky-400" />
                                                            <span className="text-[10px] text-white whitespace-nowrap">{char.name}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelineThreadBoard;

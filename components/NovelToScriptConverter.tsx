import React, { useState } from 'react';
import { Chapter, WorldEntityType } from '../types';
import * as geminiService from '../services/geminiService';
import { BookIcon, LoaderIcon } from './Icons';

interface NovelToScriptConverterProps {
    chapter: Chapter;
    worldData: Record<string, WorldEntityType[]>;
    onConvert: (script: string) => void;
}

const NovelToScriptConverter: React.FC<NovelToScriptConverterProps> = ({ chapter, worldData, onConvert }) => {
    const [isConverting, setIsConverting] = useState(false);
    const [script, setScript] = useState<string | null>(null);

    const handleConvert = async () => {
        setIsConverting(true);
        try {
            const result = await geminiService.convertProseToScript(chapter.content, worldData);
            setScript(result);
            onConvert(result);
        } catch (error) {
            console.error("Conversion Failed", error);
            alert("Failed to convert chapter. Please try again.");
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                    <BookIcon /> Novel-to-Script Generator
                </h3>
                <button 
                    onClick={handleConvert} 
                    disabled={isConverting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {isConverting ? <LoaderIcon className="animate-spin" /> : "Convert Chapter"}
                </button>
            </div>

            <div className="bg-slate-900 p-4 rounded-lg text-sm text-slate-400 mb-4">
                <p className="mb-2">
                    <span className="font-bold text-white">Source:</span> {chapter.title} ({chapter.wordCount} words)
                </p>
                <p className="italic">
                    This will use AI to reformat your prose into standard screenplay format, identifying scene headers from your Location list and dialogue from your Characters.
                </p>
            </div>

            {script && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Generated Script</h4>
                        <button 
                            onClick={() => navigator.clipboard.writeText(script)}
                            className="text-xs text-indigo-400 hover:text-white"
                        >
                            Copy to Clipboard
                        </button>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 p-6 rounded-lg border border-white/5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                        {script}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NovelToScriptConverter;

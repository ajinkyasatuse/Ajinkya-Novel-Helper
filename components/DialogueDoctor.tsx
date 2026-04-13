import React, { useState } from 'react';
import { Character } from '../types';
import * as geminiService from '../services/geminiService';
import { SparklesIcon, LoaderIcon } from './Icons';

interface DialogueDoctorProps {
    charA: Character;
    charB: Character;
    dialogueSnippet: string;
}

const DialogueDoctor: React.FC<DialogueDoctorProps> = ({ charA, charB, dialogueSnippet }) => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const result = await geminiService.analyzeDialogue(charA, charB, dialogueSnippet);
            setAnalysis(result);
        } catch (error) {
            console.error("Dialogue Analysis Failed", error);
            setAnalysis("Failed to analyze dialogue. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-white/10 shadow-lg">
            <h3 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
                <SparklesIcon /> Dialogue Doctor
            </h3>
            
            <div className="bg-slate-900 p-4 rounded-lg mb-4 text-sm text-slate-300 italic border-l-4 border-indigo-500">
                "{dialogueSnippet}"
            </div>

            <button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
                {loading ? <LoaderIcon className="animate-spin" /> : "Analyze Voices"}
            </button>

            {analysis && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">Analysis Report</h4>
                    <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 p-4 rounded-lg border border-white/5">
                        <pre className="whitespace-pre-wrap font-sans text-slate-300">{analysis}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DialogueDoctor;

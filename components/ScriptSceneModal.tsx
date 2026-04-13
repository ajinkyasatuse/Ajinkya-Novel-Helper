import React, { useState } from 'react';
import { CloseIcon } from './Icons';

interface ScriptSceneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (sceneHeading: string, details?: string) => void;
}

const ScriptSceneModal: React.FC<ScriptSceneModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [intExt, setIntExt] = useState('INT.');
    const [location, setLocation] = useState('');
    const [time, setTime] = useState('DAY');
    const [details, setDetails] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const heading = `${intExt} ${location.toUpperCase()} - ${time}`;
        onSubmit(heading, details);
        // Reset defaults
        setLocation('');
        setDetails('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-primary rounded-lg shadow-xl w-full max-w-md border border-white/10">
                <header className="flex justify-between items-center p-4 border-b border-white/5">
                    <h2 className="text-lg font-bold text-text-primary">New Scene Heading</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-text-secondary"><CloseIcon /></button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-text-secondary mb-1">INT/EXT</label>
                            <select value={intExt} onChange={e => setIntExt(e.target.value)} className="w-full bg-secondary border border-white/10 rounded px-2 py-2 text-sm focus:ring-accent focus:border-accent">
                                <option value="INT.">INT.</option>
                                <option value="EXT.">EXT.</option>
                                <option value="I/E.">I/E.</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-text-secondary mb-1">LOCATION</label>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={e => setLocation(e.target.value)} 
                                placeholder="e.g. COFFEE SHOP" 
                                autoFocus
                                required
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent uppercase placeholder:normal-case"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1">TIME</label>
                        <div className="flex flex-wrap gap-2">
                            {['DAY', 'NIGHT', 'MORNING', 'EVENING', 'CONTINUOUS', 'LATER', 'MOMENTS LATER'].map(t => (
                                <button 
                                    key={t}
                                    type="button"
                                    onClick={() => setTime(t)}
                                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${time === t ? 'bg-accent text-white border-accent' : 'bg-secondary text-text-secondary border-white/10 hover:border-white/30'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1">CONTEXT / DETAILS (AI Only)</label>
                        <textarea 
                            value={details} 
                            onChange={e => setDetails(e.target.value)} 
                            placeholder="Optional: Describe the mood, weather, or key plot points for the AI assistant..." 
                            rows={2}
                            className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded bg-accent text-white text-sm font-bold hover:bg-sky-400 transition-colors shadow-lg shadow-accent/20">Insert Scene</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScriptSceneModal;
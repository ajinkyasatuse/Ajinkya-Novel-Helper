
import React, { useState, useEffect, useMemo } from 'react';
import { BaseWorldEntity, WorldEntityType, Character, Item, Creature, Connection, Clan, Lore, Region, Dialog } from '../types';
import { UploadIcon, PlusIcon, CloseIcon, SparklesIcon, LoaderIcon, TrashIcon, DownloadIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import MapBuilder from './MapBuilder';

interface WorldEntityEditorProps {
    entity?: WorldEntityType;
    entityType: string;
    onSave: (entity: WorldEntityType | Omit<WorldEntityType, 'id' | 'novelId'>) => Promise<void>;
    onDelete: () => void;
    allCharacters: Character[];
    allRegions: Region[];
    availableCategories: string[];
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const AutocompleteInput: React.FC<{
    entities: { id: string, name: string }[];
    value: string | undefined;
    onChange: (value: string) => void;
    placeholder: string;
    excludeIds?: string[];
}> = ({ entities, value, onChange, placeholder, excludeIds = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
        if (!value) {
           setSearchTerm('');
        } else {
            const entity = entities.find(e => e.id === value);
            if (entity) setSearchTerm(entity.name);
            else setSearchTerm(value); // If it's a string not ID
        }
    }, [value, entities]);

    const filteredEntities = useMemo(() => {
        return entities.filter(e => 
            !excludeIds.includes(e.id) && 
            e.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [entities, searchTerm, excludeIds]);

    return (
        <div className="relative flex-grow">
            <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); }}
                onBlur={() => {
                    setTimeout(() => setIsOpen(false), 200);
                    if (!searchTerm) onChange('');
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full bg-secondary border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {isOpen && filteredEntities.length > 0 && (
                <ul className="absolute z-50 w-full bg-secondary border border-white/10 rounded-md mt-1 max-h-40 overflow-y-auto shadow-xl">
                    {filteredEntities.map(e => (
                        <li key={e.id} 
                            onMouseDown={() => { onChange(e.id); setSearchTerm(e.name); setIsOpen(false); }}
                            className="p-2 text-xs hover:bg-white/10 cursor-pointer text-text-primary"
                        >
                            {e.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const WorldEntityEditor: React.FC<WorldEntityEditorProps> = ({ entity, entityType, onSave, onDelete, allCharacters, allRegions, availableCategories }) => {
    const [formData, setFormData] = useState<any>({});
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    // Save State Feedback
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    useEffect(() => {
        if (entity) {
            setFormData({ ...entity });
        } else {
            // Default for new entity
            setFormData({ 
                name: '', 
                description: '', 
                category: '',
                connections: []
            });
        }
        setSaveSuccess(false);
    }, [entity]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
        if(saveSuccess) setSaveSuccess(false); // Reset success on edit
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error(error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            handleChange('imageUrl', base64);
        }
    };

    const handleGenerateImage = async () => {
        if (!formData.name || !formData.description) {
            alert("Please enter a name and description first.");
            return;
        }
        setIsGeneratingImage(true);
        try {
            const prompt = await geminiService.generateImagePrompt(formData.name, entityType, formData.description);
            const imageBase64 = await geminiService.generateImage(prompt);
            handleChange('imageUrl', imageBase64);
        } catch (error) {
            console.error(error);
            alert("Failed to generate image.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleAddConnection = () => {
        const newConnection: Connection = { targetId: '', type: 'Related', description: '' };
        handleChange('connections', [...(formData.connections || []), newConnection]);
    };

    const handleUpdateConnection = (index: number, field: keyof Connection, value: string) => {
        const newConnections = [...(formData.connections || [])];
        newConnections[index] = { ...newConnections[index], [field]: value };
        handleChange('connections', newConnections);
    };

    const handleRemoveConnection = (index: number) => {
        const newConnections = [...(formData.connections || [])];
        newConnections.splice(index, 1);
        handleChange('connections', newConnections);
    };

    const renderCommonFields = () => (
        <>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3 flex flex-col gap-2">
                    <div className="aspect-square bg-secondary/50 rounded-lg border border-white/10 flex items-center justify-center relative group overflow-hidden">
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} alt={formData.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-text-secondary text-xs">No Image</span>
                        )}
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs flex items-center gap-2">
                                <UploadIcon /> Upload
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                            <button onClick={handleGenerateImage} disabled={isGeneratingImage} className="bg-accent/80 hover:bg-accent text-white px-3 py-1.5 rounded text-xs flex items-center gap-2">
                                {isGeneratingImage ? <LoaderIcon /> : <SparklesIcon />} Generate
                            </button>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-2/3 space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Name</label>
                        <input 
                            value={formData.name || ''} 
                            onChange={e => handleChange('name', e.target.value)} 
                            className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="Entity Name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Group / Category</label>
                        <div className="flex gap-2">
                            <input 
                                list="categories"
                                value={formData.category || ''} 
                                onChange={e => handleChange('category', e.target.value)} 
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                placeholder="e.g. Protagonists, Kingdom of X..."
                            />
                            <datalist id="categories">
                                {availableCategories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Description</label>
                        <textarea 
                            value={formData.description || ''} 
                            onChange={e => handleChange('description', e.target.value)} 
                            rows={4}
                            className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                            placeholder="Description..."
                        />
                    </div>
                </div>
            </div>
        </>
    );

    const renderSpecificFields = () => {
        switch(entityType) {
            case 'Character':
            case 'Creature':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {['race', 'gender', 'birthplace', 'occupation', 'powers', 'ability', 'skills'].map(field => (
                            <div key={field}>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">{field}</label>
                                <input 
                                    value={formData[field] || ''} 
                                    onChange={e => handleChange(field, e.target.value)} 
                                    className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                        ))}
                    </div>
                );
            case 'Region':
                return (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Location Details</label>
                            <input 
                                value={formData.location || ''} 
                                onChange={e => handleChange('location', e.target.value)} 
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                placeholder="Where is this located?"
                            />
                        </div>
                        <div className="border-t border-white/5 pt-4">
                            <h4 className="text-sm font-bold text-text-secondary mb-2">Interactive Map</h4>
                            <MapBuilder 
                                imageUrl={formData.mapImage} 
                                pins={formData.mapPins} 
                                onSaveImage={(base64) => handleChange('mapImage', base64)} 
                                onUpdatePins={(pins) => handleChange('mapPins', pins)}
                                linkableEntities={[...allCharacters, ...allRegions]} // Example links
                            />
                        </div>
                    </div>
                );
            case 'Lore':
                return (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Main Plot Relevance</label>
                            <textarea 
                                value={formData.mainPlotRelevance || ''} 
                                onChange={e => handleChange('mainPlotRelevance', e.target.value)} 
                                rows={2}
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Subplot Relevance</label>
                            <textarea 
                                value={formData.subplotRelevance || ''} 
                                onChange={e => handleChange('subplotRelevance', e.target.value)} 
                                rows={2}
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    </div>
                );
            case 'Event':
                return (
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Date / Time</label>
                        <input 
                            type="text"
                            value={formData.date || ''} 
                            onChange={e => handleChange('date', e.target.value)} 
                            className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="e.g. Year 305, 12th of May, or 2024-10-10"
                        />
                    </div>
                );
            case 'Item':
            case 'Magical Thing':
                return (
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Type / Rarity</label>
                        <input 
                            value={formData.type || ''} 
                            onChange={e => handleChange('type', e.target.value)} 
                            className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="e.g. Weapon, Artifact, Common..."
                        />
                    </div>
                );
            case 'Clan':
                return (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Homeland / Base</label>
                            <input 
                                value={formData.homeland || ''} 
                                onChange={e => handleChange('homeland', e.target.value)} 
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Achievements / Reputation</label>
                            <textarea 
                                value={formData.achievements || ''} 
                                onChange={e => handleChange('achievements', e.target.value)} 
                                rows={2}
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    </div>
                );
            case 'Dialog':
            case 'Poem':
            case 'Quote':
                return (
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                                {entityType === 'Poem' ? 'Author' : 'Speaker'}
                            </label>
                            <AutocompleteInput 
                                entities={allCharacters} 
                                value={entityType === 'Poem' ? formData.authorId : formData.speakerId} 
                                onChange={(val) => handleChange(entityType === 'Poem' ? 'authorId' : 'speakerId', val)} 
                                placeholder={`Select ${entityType === 'Poem' ? 'Author' : 'Speaker'}...`} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Content</label>
                            <textarea 
                                value={formData.content || ''} 
                                onChange={e => handleChange('content', e.target.value)} 
                                rows={5}
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-serif"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Context</label>
                            <input 
                                value={formData.context || ''} 
                                onChange={e => handleChange('context', e.target.value)} 
                                className="w-full bg-secondary border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderConnections = () => {
        if (entityType === 'Dialog' || entityType === 'Poem' || entityType === 'Quote') return null; // Dialogs link differently or not at all here
        return (
            <div className="mt-6 border-t border-white/5 pt-4">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-text-secondary">Connections & Relationships</h4>
                    <button onClick={handleAddConnection} className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded flex items-center gap-1">
                        <PlusIcon /> Add Link
                    </button>
                </div>
                <div className="space-y-2">
                    {(formData.connections || []).map((conn: Connection, idx: number) => (
                        <div key={idx} className="flex flex-wrap gap-2 items-center bg-secondary/30 p-2 rounded border border-white/5">
                            <div className="w-1/3 min-w-[120px] flex-grow">
                                <AutocompleteInput 
                                    entities={[...allCharacters, ...allRegions]} // Expand this list as needed
                                    value={conn.targetId}
                                    onChange={(val) => handleUpdateConnection(idx, 'targetId', val)}
                                    placeholder="Target Entity..."
                                    excludeIds={[entity?.id || '']}
                                />
                            </div>
                            <input 
                                value={conn.type} 
                                onChange={e => handleUpdateConnection(idx, 'type', e.target.value)}
                                className="w-24 bg-secondary border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none"
                                placeholder="Type (e.g. Ally)"
                            />
                            <input 
                                value={conn.description || ''} 
                                onChange={e => handleUpdateConnection(idx, 'description', e.target.value)}
                                className="flex-grow bg-secondary border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none"
                                placeholder="Details..."
                            />
                            <button onClick={() => handleRemoveConnection(idx)} className="text-text-secondary hover:text-red-400 p-1"><TrashIcon /></button>
                        </div>
                    ))}
                    {(formData.connections || []).length === 0 && <p className="text-xs text-text-secondary italic">No connections yet.</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow space-y-4">
                {renderCommonFields()}
                {renderSpecificFields()}
                {renderConnections()}
            </div>
            
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5 sticky bottom-0 bg-primary z-10 pb-2">
                <button 
                    onClick={onDelete} 
                    disabled={!entity}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2 px-3 py-2 rounded hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <TrashIcon /> Delete
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className={`px-6 py-2 rounded-lg font-semibold shadow-lg transition-all active:scale-95 flex items-center gap-2 ${saveSuccess ? 'bg-green-600 text-white' : 'bg-accent hover:bg-sky-400 text-white'}`}
                >
                    {isSaving ? <LoaderIcon /> : null}
                    {saveSuccess ? 'Saved!' : `Save ${entityType}`}
                </button>
            </div>
        </div>
    );
};

export default WorldEntityEditor;

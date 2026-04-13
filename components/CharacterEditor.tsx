
import React, { useState, useEffect, useMemo } from 'react';
import { Character, Connection } from '../types';
import { UploadIcon, PlusIcon, CloseIcon } from './Icons';

interface CharacterEditorProps {
    character?: Character;
    allCharacters: Character[];
    onSave: (character: Character | Omit<Character, 'id' | 'novelId'>) => void;
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
    characters: Character[],
    onSelect: (id: string) => void,
    excludeId?: string
}> = ({ characters, onSelect, excludeId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredCharacters = useMemo(() => {
        if (!searchTerm) return [];
        return characters.filter(c => 
            c.id !== excludeId && 
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, characters, excludeId]);

    const handleSelect = (id: string) => {
        onSelect(id);
        setSearchTerm('');
        setIsOpen(false);
    };

    return (
        <div className="relative flex-grow">
            <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder="Search character..."
                className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {isOpen && filteredCharacters.length > 0 && (
                <ul className="absolute z-10 w-full bg-slate-700 border border-slate-600 rounded-md mt-1 max-h-40 overflow-y-auto">
                    {filteredCharacters.map(char => (
                        <li key={char.id} onMouseDown={() => handleSelect(char.id)}
                            className="p-2 text-sm hover:bg-accent cursor-pointer">
                            {char.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const CharacterEditor: React.FC<CharacterEditorProps> = ({ character, allCharacters, onSave }) => {
    const isCreating = !character;
    const [formData, setFormData] = useState<Omit<Character, 'id' | 'novelId'>>({
        name: character?.name || '',
        description: character?.description || '',
        imageUrl: character?.imageUrl,
        location: character?.location || '',
        race: character?.race || '',
        gender: character?.gender || '',
        birthplace: character?.birthplace || '',
        powers: character?.powers || '',
        ability: character?.ability || '',
        skills: character?.skills || '',
        connections: character?.connections || [],
    });

    const [newRelationship, setNewRelationship] = useState<{ targetId: string; type: Connection['type'] }>({ targetId: '', type: 'Friend' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setFormData({ ...formData, imageUrl: base64 });
        }
    };

    const handleAddRelationship = () => {
        if (newRelationship.targetId && !(formData.connections || []).some(r => r.targetId === newRelationship.targetId)) {
            setFormData({
                ...formData,
                connections: [...(formData.connections || []), { ...newRelationship, description: '' }]
            });
            setNewRelationship({ targetId: '', type: 'Friend' });
        }
    };
    
    const handleRemoveRelationship = (targetId: string) => {
        setFormData({
            ...formData,
            connections: (formData.connections || []).filter(r => r.targetId !== targetId)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreating) {
            onSave(formData);
        } else {
            onSave({ ...formData, id: character.id, novelId: character.novelId });
        }
    };
    
    const relationshipTypes: Connection['type'][] = ['Ally', 'Enemy', 'Family', 'Mentor', 'Student', 'Romantic Interest', 'Friend', 'Rival', 'Other'];


    return (
        <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                <div className="flex gap-4">
                    <div className="w-1/3">
                         <label className="block text-sm font-medium text-text-secondary mb-1">Reference Image</label>
                         <div className="w-full aspect-square bg-secondary rounded-md flex items-center justify-center relative group">
                             {formData.imageUrl ? <img src={formData.imageUrl} alt={formData.name} className="w-full h-full object-cover rounded-md" /> : <span className="text-text-secondary text-xs">No Image</span>}
                             <label htmlFor="image-upload" className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md">
                                <UploadIcon /> <span className="ml-2">Upload</span>
                             </label>
                             <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                         </div>
                    </div>
                    <div className="w-2/3 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} required className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary">Description</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={5} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-text-secondary">Location</label><input name="location" value={formData.location} onChange={handleChange} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                    <div><label className="block text-sm font-medium text-text-secondary">Race</label><input name="race" value={formData.race} onChange={handleChange} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                    <div><label className="block text-sm font-medium text-text-secondary">Gender</label><input name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                    <div><label className="block text-sm font-medium text-text-secondary">Birthplace</label><input name="birthplace" value={formData.birthplace} onChange={handleChange} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                    <div><label className="block text-sm font-medium text-text-secondary">Powers</label><input name="powers" value={formData.powers} onChange={handleChange} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                    <div><label className="block text-sm font-medium text-text-secondary">Ability</label><input name="ability" value={formData.ability} onChange={handleChange} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                    <div><label className="block text-sm font-medium text-text-secondary">Skills</label><input name="skills" value={formData.skills} onChange={handleChange} className="w-full bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mt-4 mb-2">Relationships</h3>
                    <div className="flex gap-2 mb-2">
                        <AutocompleteInput
                           characters={allCharacters}
                           excludeId={character?.id}
                           onSelect={(id) => setNewRelationship({...newRelationship, targetId: id})}
                        />
                         <select value={newRelationship.type} onChange={e => setNewRelationship({...newRelationship, type: e.target.value as Connection['type']})} className="bg-secondary border border-slate-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                             {relationshipTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <button type="button" onClick={handleAddRelationship} className="bg-accent text-white p-2 rounded-md hover:bg-sky-400" aria-label="Add relationship"><PlusIcon /></button>
                    </div>
                    <ul className="space-y-1 text-sm">
                        {(formData.connections || []).map(rel => {
                            const targetChar = allCharacters.find(c => c.id === rel.targetId);
                            return (
                                <li key={rel.targetId} className="flex justify-between items-center bg-secondary p-2 rounded-md">
                                    <span><strong>{targetChar?.name || 'Unknown'}</strong> is a/an <strong>{rel.type}</strong></span>
                                    <button type="button" onClick={() => handleRemoveRelationship(rel.targetId)} className="p-1 rounded-full hover:bg-slate-600" aria-label={`Remove relationship with ${targetChar?.name}`}><CloseIcon /></button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
            <div className="flex-shrink-0 pt-4 border-t border-secondary">
                <button type="submit" className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-500">
                    {isCreating ? 'Create Character' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

export default CharacterEditor;

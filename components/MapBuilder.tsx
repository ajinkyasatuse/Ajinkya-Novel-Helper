
import React, { useState, useRef } from 'react';
import { MapPin, WorldEntityType } from '../types';
import { UploadIcon, CloseIcon, TrashIcon } from './Icons';

interface MapBuilderProps {
    imageUrl?: string;
    pins?: MapPin[];
    onSaveImage: (base64: string) => void;
    onUpdatePins: (pins: MapPin[]) => void;
    linkableEntities: WorldEntityType[];
}

const MapBuilder: React.FC<MapBuilderProps> = ({ imageUrl, pins = [], onSaveImage, onUpdatePins, linkableEntities }) => {
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) onSaveImage(ev.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageUrl || !imageRef.current || isEditing) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newPin: MapPin = {
            id: Date.now().toString(),
            x,
            y,
            label: 'New Location',
            description: ''
        };

        onUpdatePins([...pins, newPin]);
        setSelectedPinId(newPin.id);
        setIsEditing(true);
    };

    const handleUpdatePin = (updates: Partial<MapPin>) => {
        if (!selectedPinId) return;
        const updatedPins = pins.map(p => p.id === selectedPinId ? { ...p, ...updates } : p);
        onUpdatePins(updatedPins);
    };

    const handleDeletePin = () => {
        if (!selectedPinId) return;
        const updatedPins = pins.filter(p => p.id !== selectedPinId);
        onUpdatePins(updatedPins);
        setSelectedPinId(null);
        setIsEditing(false);
    };

    const selectedPin = pins.find(p => p.id === selectedPinId);

    return (
        <div className="space-y-4">
            {!imageUrl ? (
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center bg-secondary/30 h-64 cursor-pointer hover:bg-secondary/50 transition-colors relative">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <UploadIcon />
                    <p className="mt-2 text-sm text-text-secondary">Upload Map Image</p>
                </div>
            ) : (
                <div className="relative w-full bg-black rounded-xl overflow-hidden border border-white/10 group">
                    <div className="relative cursor-crosshair" onClick={handleImageClick}>
                        <img 
                            ref={imageRef}
                            src={imageUrl} 
                            alt="Region Map" 
                            className="w-full h-auto object-contain max-h-[600px]" 
                        />
                        {pins.map(pin => (
                            <div
                                key={pin.id}
                                className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group-hover:scale-100 scale-90 transition-transform ${selectedPinId === pin.id ? 'z-20' : 'z-10'}`}
                                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPinId(pin.id);
                                    setIsEditing(true);
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill={selectedPinId === pin.id ? '#ef4444' : '#0ea5e9'} className="drop-shadow-md">
                                    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 7 13s7-7.75 7-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                                </svg>
                                <span className="absolute top-full left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap mt-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    {pin.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    
                    {/* Floating Editor Panel */}
                    {isEditing && selectedPin && (
                        <div className="absolute top-4 right-4 w-64 bg-secondary/95 backdrop-blur border border-white/20 rounded-lg shadow-2xl p-4 z-30 animate-fade-in">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold uppercase text-accent">Edit Pin</h4>
                                <button onClick={() => setIsEditing(false)}><CloseIcon /></button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Label</label>
                                    <input 
                                        value={selectedPin.label} 
                                        onChange={e => handleUpdatePin({ label: e.target.value })} 
                                        className="w-full bg-primary border border-white/10 rounded px-2 py-1 text-sm focus:border-accent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Link to Entity</label>
                                    <select 
                                        value={selectedPin.linkedEntityId || ''} 
                                        onChange={e => handleUpdatePin({ linkedEntityId: e.target.value })}
                                        className="w-full bg-primary border border-white/10 rounded px-2 py-1 text-sm focus:border-accent outline-none"
                                    >
                                        <option value="">No Link</option>
                                        {linkableEntities.map(e => (
                                            <option key={e.id} value={e.id}>{e.name} ({e.category || 'Entity'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Description</label>
                                    <textarea 
                                        value={selectedPin.description || ''} 
                                        onChange={e => handleUpdatePin({ description: e.target.value })} 
                                        rows={3}
                                        className="w-full bg-primary border border-white/10 rounded px-2 py-1 text-xs focus:border-accent outline-none resize-none"
                                    />
                                </div>
                                <button 
                                    onClick={handleDeletePin}
                                    className="w-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <TrashIcon /> Delete Pin
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MapBuilder;


import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { WorldEntityType, Character } from '../types';
import { SearchIcon, BookIcon, UserIcon, GlobeIcon, CalendarIcon, ScrollIcon, DragonIcon } from './Icons';

type WorldData = {
    characters: any[];
    regions: any[];
    lores: any[];
    events: any[];
    items: any[];
    clans: any[];
    creatures: any[];
    magicalThings: any[];
    chapters?: any[]; // Added support for chapters
    [key: string]: any;
};

interface GlobalSearchProps {
    worldData: WorldData;
    onSelect: (entity: any) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    novelId?: string;
}

export interface SearchResultItem {
    id: string;
    type: string;
    name: string;
    description: string;
    category?: string;
    imageUrl?: string;
    matchType: 'name' | 'content' | 'description' | 'tag';
    snippet?: string;
    targetPath?: string;
    originalEntity: any;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ worldData, onSelect, disabled, autoFocus, novelId }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const searchResults = useMemo(() => {
        if (!query || query.trim().length < 2) return [];

        const lowerQuery = query.toLowerCase().trim();
        const results: SearchResultItem[] = [];

        const addResult = (type: string, entity: any, matchType: SearchResultItem['matchType'], snippet?: string, targetPath?: string) => {
            if (!entity || !entity.id) return;
            // Avoid duplicates
            if (!results.some(r => r.id === entity.id && r.type === type)) {
                results.push({
                    id: entity.id,
                    type,
                    name: entity.name || entity.title || 'Untitled',
                    description: entity.description || '',
                    category: entity.category || '',
                    imageUrl: entity.imageUrl,
                    matchType,
                    snippet,
                    targetPath,
                    originalEntity: entity
                });
            }
        };

        // 1. Search World Entities
        Object.entries(worldData).forEach(([type, items]) => {
            if (type === 'chapters') return; // Handled separately
            if (!Array.isArray(items)) return;
            
            items.forEach(item => {
                if (!item) return;
                const name = (item.name || "").toLowerCase();
                const desc = (item.description || "").toLowerCase();
                const content = (item.content || "").toLowerCase(); // For poems/quotes/dialogs
                const category = (item.category || "").toLowerCase();

                if (name.includes(lowerQuery)) {
                    addResult(type, item, 'name');
                } else if (category.includes(lowerQuery)) {
                    addResult(type, item, 'tag');
                } else if (desc.includes(lowerQuery)) {
                    addResult(type, item, 'description', item.description?.substring(0, 100) + "...");
                } else if (content.includes(lowerQuery)) {
                    const idx = content.indexOf(lowerQuery);
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(item.content.length, idx + 60);
                    const snippet = "..." + item.content.substring(start, end) + "...";
                    addResult(type, item, 'content', snippet);
                }
            });
        });

        // 2. Search Chapters
        const chapters = worldData.chapters || [];
        chapters.forEach(chapter => {
            if (!chapter) return;
            const title = (chapter.title || "").toLowerCase();
            const content = (chapter.content || "").toLowerCase();
            
            const bookId = chapter.bookId;
            const targetPath = (novelId && bookId) ? `/novel/${novelId}/editor/${bookId}/${chapter.id}` : undefined;

            if (title.includes(lowerQuery)) {
                addResult('chapters', chapter, 'name', undefined, targetPath);
            } else if (content.includes(lowerQuery)) {
                // Find snippet around match
                // Strip HTML tags for clean snippet
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = chapter.content || "";
                const plainText = tempDiv.textContent || tempDiv.innerText || "";
                const plainLower = plainText.toLowerCase();
                
                const idx = plainLower.indexOf(lowerQuery);
                if (idx !== -1) {
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(plainText.length, idx + 60);
                    const snippet = "..." + plainText.substring(start, end) + "...";
                    addResult('chapters', chapter, 'content', snippet, targetPath);
                } else {
                    addResult('chapters', chapter, 'content', undefined, targetPath);
                }
            }
        });

        // Sort results
        return results.sort((a, b) => {
            if (a.matchType === 'name' && b.matchType !== 'name') return -1;
            if (b.matchType === 'name' && a.matchType !== 'name') return 1;
            if (a.matchType === 'tag' && b.matchType !== 'tag') return -1;
            if (b.matchType === 'tag' && a.matchType !== 'tag') return 1;
            return 0;
        }).slice(0, 50);
    }, [query, worldData, novelId]);

    const handleSelect = useCallback((result: SearchResultItem) => {
        const entity = {
            ...result.originalEntity,
            __type: result.type,
            targetPath: result.targetPath,
            snippet: result.snippet
        };
        onSelect(entity);
        setQuery('');
        setIsOpen(false);
    }, [onSelect]);

    useEffect(() => {
        setHighlightedIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || searchResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSelect(searchResults[highlightedIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (listRef.current && isOpen) {
            const activeItem = listRef.current.children[highlightedIndex + 1] as HTMLElement; // +1 for header
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'characters': return <UserIcon />;
            case 'regions': return <GlobeIcon />;
            case 'lores': return <BookIcon />;
            case 'events': return <CalendarIcon />;
            case 'chapters': return <ScrollIcon />;
            case 'creatures': return <DragonIcon />;
            default: return <SearchIcon />;
        }
    };

    const formatType = (type: string, entity: any) => {
        if (type === 'customEntities' && entity.customTabName) return entity.customTabName;
        if (type === 'chapters') return 'Chapter';
        return type.replace(/s$/, ''); // Basic singularize
    };

    return (
        <div className="relative w-full" ref={searchRef}>
            <div className="relative group" onKeyDown={handleKeyDown}>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary group-focus-within:text-accent transition-colors">
                    <SearchIcon />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={disabled ? "Select a novel first" : "Search characters, groups, chapters, lore..."}
                    disabled={disabled}
                    className="w-full bg-secondary/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:bg-secondary focus:border-accent transition-all shadow-inner text-text-primary placeholder:text-text-secondary/50"
                    autoComplete="off"
                />
                {query && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-text-secondary">ESC</span>
                    </div>
                )}
            </div>

            {isOpen && searchResults.length > 0 && (
                <ul ref={listRef} className="absolute z-50 mt-2 w-full bg-secondary border border-white/10 rounded-xl shadow-2xl max-h-[60vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    <li className="px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold bg-white/5 sticky top-0 backdrop-blur-sm z-10 border-b border-white/5 flex justify-between">
                        <span>Best Matches</span>
                        <span className="opacity-50">{searchResults.length} results</span>
                    </li>
                    {searchResults.map((result, index) => {
                        const isSelected = highlightedIndex === index;
                        
                        return (
                            <li 
                                key={`${result.type}-${result.id}`}
                                onMouseDown={() => handleSelect(result)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`px-3 py-2.5 cursor-pointer flex items-center gap-3 transition-colors border-b border-white/5 last:border-0 ${isSelected ? 'bg-accent text-white' : 'hover:bg-white/5 text-text-primary'}`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-primary border border-white/10'}`}>
                                    {result.imageUrl ? (
                                        <img src={result.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <span className={`transform scale-75 ${isSelected ? 'text-white' : 'text-text-secondary'}`}>
                                            {getIcon(result.type)}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex-grow min-w-0 flex flex-col">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold truncate text-sm">
                                            {result.name}
                                        </span>
                                        <span className={`text-[10px] px-1.5 rounded-full flex-shrink-0 uppercase tracking-wide ${isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-text-secondary'}`}>
                                            {formatType(result.type, result.originalEntity)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs opacity-80 truncate">
                                        {result.snippet ? (
                                            <span className="italic opacity-90 truncate text-xs">
                                                "{result.snippet}"
                                            </span>
                                        ) : (
                                            <span className="truncate opacity-70">
                                                {result.description || "No description"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {isSelected && (
                                    <div className="flex-shrink-0">
                                        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">↵</span>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {isOpen && query.trim().length >= 2 && searchResults.length === 0 && (
                <div className="absolute z-50 mt-2 w-full bg-secondary border border-white/10 rounded-xl shadow-2xl p-4 text-center text-text-secondary text-sm animate-in fade-in zoom-in-95 duration-100">
                    No results found for "{query}"
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;

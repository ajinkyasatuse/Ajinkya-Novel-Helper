
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Character, Region, Lore, Event, Item, Clan, Creature, MagicalThing, Dialog, CustomEntity, WorldEntityType, Book, Poem, Quote } from '../types';
import RelationshipVisualizer from './RelationshipVisualizer';
import MagicTimeline from './MagicTimeline';
import { CloseIcon, PlusIcon, SearchIcon, PencilIcon, TrashIcon, CommentIcon } from './Icons';
import WorldEntityEditor from './WorldEntityEditor';

type WorldData = {
    characters: Character[];
    regions: Region[];
    lores: Lore[];
    events: Event[];
    items: Item[];
    clans: Clan[];
    creatures: Creature[];
    magicalThings: MagicalThing[];
    dialogs: Dialog[];
    poems: Poem[];
    quotes: Quote[];
    customEntities: CustomEntity[];
};

export type TabName = 'Characters' | 'Creatures' | 'Regions' | 'Lore' | 'Events' | 'All Items' | 'Magical Things' | 'Clans' | 'Dialogs' | 'Poems' | 'Quotes' | 'Connections' | 'Timeline' | string;

interface WorldItemManagerProps {
  isOpen: boolean;
  onClose: () => void;
  worldData: WorldData;
  novelId: string | null;
  activeBook?: Book;
  onSaveEntity: (entity: WorldEntityType, tab: string) => Promise<void>;
  onDeleteEntity: (id: string, tab: string) => void;
  initialTarget?: { tab: string, id: string } | null;
  onTargetHandled?: () => void;
}

const WorldItemManager: React.FC<WorldItemManagerProps> = ({ isOpen, onClose, worldData, novelId, activeBook, onSaveEntity, onDeleteEntity, initialTarget, onTargetHandled }) => {
  const [activeTab, setActiveTab] = useState<string>('Characters');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const customTabs = useMemo(() => {
      const tabs = new Set<string>();
      worldData.customEntities.forEach(e => {
          if (e.novelId === novelId) tabs.add(e.customTabName);
      });
      return Array.from(tabs);
  }, [worldData.customEntities, novelId]);

  const defaultTabs = ['Characters', 'Creatures', 'Regions', 'Lore', 'Events', 'All Items', 'Magical Things', 'Clans', 'Dialogs', 'Poems', 'Quotes', 'Connections', 'Timeline'];
  const allTabs = [...defaultTabs, ...customTabs];

  useEffect(() => {
    if (initialTarget && onTargetHandled) {
        handleTabClick(initialTarget.tab);
        handleSelectItem(initialTarget.id);
        onTargetHandled();
    }
  }, [initialTarget, onTargetHandled]);

  const handleClose = () => {
    setMobileView('list');
    onClose();
  }

  const activeListData = useMemo(() => {
      let data: WorldEntityType[] = [];
      const tabToDataKey: Record<string, keyof WorldData> = {
        'Characters': 'characters',
        'Creatures': 'creatures',
        'Regions': 'regions',
        'Lore': 'lores',
        'Events': 'events',
        'All Items': 'items',
        'Magical Things': 'magicalThings',
        'Clans': 'clans',
        'Dialogs': 'dialogs',
        'Poems': 'poems',
        'Quotes': 'quotes',
      };

      if (tabToDataKey[activeTab]) {
          data = worldData[tabToDataKey[activeTab]] as WorldEntityType[];
      } else {
          data = worldData.customEntities.filter(e => e.customTabName === activeTab);
      }

      data = data.filter(item => item.novelId === novelId);

      if (searchTerm.trim() !== '') {
          data = data.filter(item => {
            const nameMatch = (item.name || "").toLowerCase().includes(searchTerm.toLowerCase());
            const catMatch = item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase());
            // Check content for dialogs, poems, quotes
            const contentMatch = (item as any).content && (item as any).content.toLowerCase().includes(searchTerm.toLowerCase());
            return nameMatch || catMatch || contentMatch;
          });
      }
      return data;
  }, [activeTab, worldData, searchTerm, novelId]);

  const groupedData = useMemo(() => {
      const groups: Record<string, WorldEntityType[]> = {};
      activeListData.forEach(item => {
          const cat = item.category || 'Ungrouped';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
      });
      return groups;
  }, [activeListData]);
  
  useEffect(() => {
      if (searchTerm) {
          setExpandedCategories(new Set(Object.keys(groupedData)));
      }
  }, [searchTerm, groupedData]);

  const toggleCategory = (cat: string) => {
      setExpandedCategories(prev => {
          const next = new Set(prev);
          if (next.has(cat)) next.delete(cat);
          else next.add(cat);
          return next;
      });
  };

  const selectedItem = useMemo(() => {
    return activeListData.find(item => item.id === selectedItemId);
  }, [selectedItemId, activeListData]);

  const handleTabClick = (tabName: string) => {
      setActiveTab(tabName);
      setSelectedItemId(null);
      setIsCreating(false);
      setSearchTerm('');
      setMobileView('list');
      setExpandedCategories(new Set()); 
  };

  const handleSelectItem = (id: string) => {
      setSelectedItemId(id);
      setIsCreating(false);
      setMobileView('editor');
  };
  
  const handleStartCreating = () => {
      setSelectedItemId(null);
      setIsCreating(true);
      setMobileView('editor');
  };
  
  const handleBackToList = () => {
    setMobileView('list');
    setSelectedItemId(null);
    setIsCreating(false);
  }

  const createNewEntity = useCallback(async (entityData: any) => {
    if (!novelId) return;
    
    const newEntity = { ...entityData, id: Date.now().toString(), novelId };
    
    if (!defaultTabs.includes(activeTab)) {
        newEntity.customTabName = activeTab;
    }
    
    await onSaveEntity(newEntity, activeTab);

    setIsCreating(false);
    setSelectedItemId(newEntity.id);
  }, [activeTab, novelId, onSaveEntity, defaultTabs]);

  const updateEntity = useCallback(async (entityData: WorldEntityType) => {
      await onSaveEntity(entityData, activeTab);
  }, [activeTab, onSaveEntity]);
  
  const handleDelete = useCallback(() => {
    if (!selectedItem) return;

    if (window.confirm(`Are you sure you want to delete this item?`)) {
        onDeleteEntity(selectedItem.id, activeTab);
        setSelectedItemId(null);
        setIsCreating(false);
        setMobileView('list');
    }
  }, [selectedItem, activeTab, onDeleteEntity]);

  const handleAddCustomTab = () => {
      if (newTabName.trim() && !allTabs.includes(newTabName.trim())) {
          setActiveTab(newTabName.trim());
          setNewTabName('');
          setIsAddingTab(false);
      }
  };
  
  const handleCreateCategory = () => {
      setIsAddingCategory(false);
      if(newCategoryName.trim()) {
           handleStartCreating();
      }
  };

  const handleRenameCategory = (oldCat: string) => {
      const newCat = prompt("Rename group to:", oldCat);
      if (newCat && newCat !== oldCat) {
          const itemsToUpdate = groupedData[oldCat] || [];
          itemsToUpdate.forEach(item => {
              updateEntity({ ...item, category: newCat });
          });
      }
  };
  
  const handleDeleteCategory = (cat: string) => {
       if (window.confirm(`Dissolve group "${cat}"? Items will be moved to 'Ungrouped'.`)) {
          const itemsToUpdate = groupedData[cat] || [];
          itemsToUpdate.forEach(item => {
              updateEntity({ ...item, category: '' });
          });
       }
  };

  if (!isOpen) return null;

  const renderEditor = () => {
      if (!isCreating && !selectedItem) {
          return (
              <div className="hidden md:flex flex-col items-center justify-center h-full text-text-secondary opacity-50">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <PlusIcon />
                  </div>
                  <p>Select an item to view details</p>
              </div>
          );
      }
      
      if (activeTab === 'Connections') return null;

      const entityTypeMap: Record<string, string> = {
        'Characters': 'Character',
        'Creatures': 'Creature',
        'Regions': 'Region',
        'Lore': 'Lore',
        'Events': 'Event',
        'All Items': 'Item',
        'Magical Things': 'Magical Thing',
        'Clans': 'Clan',
        'Dialogs': 'Dialog',
      };
      
      const entityType = entityTypeMap[activeTab] || 'Custom';

      return <WorldEntityEditor
                  key={selectedItem?.id || 'new'}
                  entity={isCreating ? (newCategoryName ? { category: newCategoryName } as any : undefined) : selectedItem}
                  entityType={entityType}
                  allCharacters={worldData.characters}
                  allRegions={worldData.regions}
                  onSave={async (entity) => {
                        if (isCreating) {
                            await createNewEntity(entity);
                            setNewCategoryName(''); 
                        } else {
                            await updateEntity(entity as WorldEntityType);
                        }
                  }}
                  onDelete={handleDelete}
                  availableCategories={Object.keys(groupedData).filter(c => c !== 'Ungrouped')}
              />
  };

  const getListItemLabel = (item: any) => {
      if (item.name && item.name.trim()) return item.name;
      if (activeTab === 'Dialogs' && item.content) {
          return `"${item.content.substring(0, 30)}${item.content.length > 30 ? '...' : ''}"`;
      }
      return 'Untitled';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-0 sm:p-4 transition-opacity duration-300">
      <div className="bg-primary sm:rounded-xl shadow-2xl w-full h-full sm:max-w-6xl sm:max-h-[90vh] flex flex-col fixed inset-0 sm:relative overflow-hidden border border-white/5">
        <header className="flex justify-between items-center p-4 border-b border-white/5 bg-secondary/50">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">World Building</h2>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close world builder"><CloseIcon /></button>
        </header>
        
        <div className="flex-shrink-0 border-b border-white/5 bg-secondary/30 overflow-x-auto custom-scrollbar flex items-center no-scrollbar">
            <nav className="flex space-x-1 px-4 py-2">
                {allTabs.map(tab => (
                    <button key={tab} onClick={() => handleTabClick(tab)}
                        className={`py-1.5 px-3 rounded-md font-medium text-sm whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === tab ? 'bg-accent/10 text-accent ring-1 ring-inset ring-accent/20' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}>
                        {tab}
                    </button>
                ))}
            </nav>
            <div className="border-l border-white/10 pl-2 pr-4 flex-shrink-0">
                 {isAddingTab ? (
                     <div className="flex items-center gap-1">
                         <input 
                            autoFocus
                            value={newTabName}
                            onChange={(e) => setNewTabName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTab()}
                            onBlur={() => setIsAddingTab(false)}
                            placeholder="Tab Name"
                            className="bg-primary border border-slate-600 rounded px-2 py-1 text-xs w-24"
                         />
                     </div>
                 ) : (
                    <button onClick={() => setIsAddingTab(true)} className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-white" title="Add Custom Tab">
                        <PlusIcon />
                    </button>
                 )}
            </div>
        </div>

        <main className="flex flex-grow overflow-hidden relative">
          {activeTab !== 'Connections' && activeTab !== 'Timeline' && (
             <aside className={`w-full md:w-80 border-r border-white/5 bg-secondary/10 flex flex-col absolute inset-y-0 md:static transition-transform duration-300 ${mobileView === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} z-10 bg-primary`}>
                <div className="p-4 border-b border-white/5 space-y-3">
                    <button onClick={handleStartCreating} className="w-full bg-accent text-white py-2 px-4 rounded-lg hover:bg-sky-400 flex items-center justify-center gap-2 font-medium shadow-lg shadow-accent/20 transition-all active:scale-95">
                        <PlusIcon /> New {activeTab === 'All Items' ? 'Item' : activeTab === 'Magical Things' ? 'Magical Thing' : activeTab === 'Lore' ? 'Lore' : activeTab === 'Custom' ? 'Entry' : activeTab.slice(0,-1)}
                    </button>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-primary border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                            <SearchIcon />
                        </div>
                    </div>
                     <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-text-secondary uppercase tracking-wider font-bold">Groups</span>
                         {isAddingCategory ? (
                             <input 
                                autoFocus
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                                onBlur={() => setIsAddingCategory(false)}
                                placeholder="New Group"
                                className="bg-primary border border-slate-600 rounded px-1 py-0.5 text-xs w-24"
                             />
                         ) : (
                             <button onClick={() => { setIsAddingCategory(true); setNewCategoryName(''); }} className="text-accent hover:text-white text-xs flex items-center gap-1 p-1">
                                 <PlusIcon /> Add Group
                             </button>
                         )}
                    </div>
                </div>
                
                <ul className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar pb-20 md:pb-2">
                {Object.keys(groupedData).length === 0 && (
                    <li className="text-center text-text-secondary py-8 text-sm italic">No items found</li>
                )}
                
                {Object.entries(groupedData).map(([category, items]: [string, WorldEntityType[]]) => (
                    <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between group px-2 py-1 rounded hover:bg-white/5">
                             <button onClick={() => toggleCategory(category)} className="flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-white flex-grow text-left py-2">
                                <span className={`transform transition-transform ${expandedCategories.has(category) ? 'rotate-90' : ''}`}>▶</span>
                                {category} ({items.length})
                             </button>
                             {category !== 'Ungrouped' && (
                                 <div className="hidden group-hover:flex items-center gap-1">
                                     <button onClick={() => handleRenameCategory(category)} className="p-1 hover:text-accent"><PencilIcon/></button>
                                     <button onClick={() => handleDeleteCategory(category)} className="p-1 hover:text-red-400"><TrashIcon/></button>
                                 </div>
                             )}
                        </div>
                        
                        {(expandedCategories.has(category) || searchTerm) && (
                            <ul className="pl-4 border-l border-white/10 ml-2 space-y-1">
                                {items.map(item => (
                                    <li key={item.id} onClick={() => handleSelectItem(item.id)}
                                    className={`cursor-pointer p-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${selectedItemId === item.id ? 'bg-accent text-white shadow-md' : 'hover:bg-white/5 text-text-primary'}`}>
                                        {activeTab === 'Dialogs' ? (
                                            <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center text-xs ${selectedItemId === item.id ? 'bg-white/20 text-white' : 'bg-white/5 text-text-secondary'}`}>
                                                <CommentIcon />
                                            </div>
                                        ) : item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0 bg-black/20" />
                                        ) : (
                                            <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center font-bold text-xs ${selectedItemId === item.id ? 'bg-white/20 text-white' : 'bg-white/5 text-text-secondary'}`}>
                                                {(item.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="truncate font-medium">{getListItemLabel(item)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
                </ul>
            </aside>
          )}

          <section className={`absolute inset-0 md:static bg-primary flex flex-col transition-transform duration-300 ${activeTab === 'Connections' || activeTab === 'Timeline' ? 'w-full' : 'md:flex-grow'} ${mobileView === 'editor' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} z-20`}>
            {activeTab === 'Connections' ? (
                <div className="w-full h-full p-4">
                    <RelationshipVisualizer allCharacters={worldData.characters} />
                </div>
            ) : activeTab === 'Timeline' ? (
                <div className="w-full h-full">
                    <MagicTimeline 
                        worldData={worldData} 
                        activeNovelId={novelId} 
                        activeBook={activeBook} 
                        onUpdateEntity={(entity, type) => onSaveEntity(entity, type)}
                    />
                </div>
            ) : (
              <div className="h-full flex flex-col">
                {mobileView === 'editor' && (
                    <div className="md:hidden p-3 border-b border-white/5 bg-secondary/50 flex items-center sticky top-0 z-10 backdrop-blur-md">
                        <button onClick={handleBackToList} className="flex items-center gap-1 text-accent font-medium px-2 py-1 rounded hover:bg-white/5">
                            <span className="text-xl">&larr;</span> Back
                        </button>
                        <span className="ml-auto text-sm font-semibold text-text-primary pr-2 truncate max-w-[200px]">
                            {isCreating ? 'New Entry' : getListItemLabel(selectedItem)}
                        </span>
                    </div>
                )}
                <div className="flex-grow p-4 md:p-6 overflow-y-auto custom-scrollbar pb-20 md:pb-6">
                    {renderEditor()}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};


export default WorldItemManager;

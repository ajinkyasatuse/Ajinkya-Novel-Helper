import React, { useState, useEffect, useRef } from 'react';
import { Novel, NovelType } from '../types';
import { PlusIcon, BookIcon, DocumentIcon, PencilIcon, TrashIcon, SettingsIcon, ImportExportIcon, FilmIcon } from './Icons';
import DailyGoalTracker from './DailyGoalTracker';

interface EditableListItemProps {
  item: { id: string, title: string };
  isActive: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  className: string;
  activeClassName: string;
}

const EditableListItem: React.FC<EditableListItemProps> = ({ item, isActive, onSelect, onUpdate, onDelete, className, activeClassName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(item.title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (title.trim() && title.trim() !== item.title) {
            onUpdate(item.id, title.trim());
        } else {
            setTitle(item.title);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setTitle(item.title);
            setIsEditing(false);
        }
    };
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to move "${item.title}" to the Bin?`)) {
            onDelete(item.id);
        }
    };
    
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    return (
        <li
            onClick={() => onSelect(item.id)}
            className={`group flex justify-between items-center cursor-pointer px-3 py-2 rounded-lg text-sm transition-all duration-200 border border-transparent ${isActive ? activeClassName : 'hover:bg-white/5 hover:border-white/5 ' + className}`}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="flex-grow bg-primary border border-accent rounded px-1 py-0.5 text-sm focus:outline-none"
                    onClick={e => e.stopPropagation()}
                />
            ) : (
                <>
                    <span className="truncate font-medium">{item.title}</span>
                    <div className="hidden group-hover:flex items-center flex-shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleEditClick} className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-white"><PencilIcon /></button>
                        <button onClick={handleDelete} className="p-1 rounded hover:bg-red-500/20 text-text-secondary hover:text-red-400"><TrashIcon /></button>
                    </div>
                </>
            )}
        </li>
    );
};


interface SidebarProps {
  novels: Novel[];
  activeNovelId: string | null;
  activeBookId: string | null;
  activeChapterId: string | null;
  onNovelSelect: (id: string) => void;
  onBookSelect: (id: string) => void;
  onChapterSelect: (id: string) => void;
  onAddNovel: (title: string, type: NovelType) => void;
  onAddBook: (title: string) => void;
  onAddChapter: (title: string) => void;
  activeNovel: Novel | undefined;
  onUpdateNovelDetails: (novelId: string, details: Partial<Novel>) => void;
  onUpdateBookTitle: (bookId: string, newTitle: string) => void;
  onUpdateChapterTitle: (chapterId: string, newTitle: string) => void;
  onDeleteNovel: (novelId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onDeleteChapter: (chapterId: string) => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  onConvertToScript: (novelId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  novels,
  activeNovelId,
  activeBookId,
  activeChapterId,
  onNovelSelect,
  onBookSelect,
  onChapterSelect,
  onAddNovel,
  onAddBook,
  onAddChapter,
  activeNovel,
  onUpdateNovelDetails,
  onUpdateBookTitle,
  onUpdateChapterTitle,
  onDeleteNovel,
  onDeleteBook,
  onDeleteChapter,
  onOpenSettings,
  onOpenImportExport,
  onConvertToScript
}) => {
  const [newNovelTitle, setNewNovelTitle] = useState('');
  const [newNovelType, setNewNovelType] = useState<NovelType>('novel');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');

  const handleAddNovel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNovelTitle.trim()) {
      onAddNovel(newNovelTitle.trim(), newNovelType);
      setNewNovelTitle('');
    }
  };

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBookTitle.trim()) {
      onAddBook(newBookTitle.trim());
      setNewBookTitle('');
    }
  };

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChapterTitle.trim()) {
      onAddChapter(newChapterTitle.trim());
      setNewChapterTitle('');
    }
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (activeNovelId) {
      onUpdateNovelDetails(activeNovelId, { [e.target.name]: e.target.value });
    }
  };
  
  const handleGoalChange = (goal: number) => {
    if (activeNovelId) {
        onUpdateNovelDetails(activeNovelId, { dailyGoal: goal });
    }
  }
  
  const activeBook = activeNovel?.books?.find(b => b.id === activeBookId);

  return (
    <div className="h-full flex flex-col bg-secondary text-text-primary">
      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
            Projects
          </h2>
          <form onSubmit={handleAddNovel} className="flex flex-col gap-2 mb-3 px-1">
            <input
              type="text"
              value={newNovelTitle}
              onChange={(e) => setNewNovelTitle(e.target.value)}
              placeholder="New project title"
              className="w-full bg-primary border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
            <div className="flex gap-2">
                <select 
                    value={newNovelType} 
                    onChange={e => setNewNovelType(e.target.value as NovelType)}
                    className="flex-grow bg-primary border border-white/10 rounded-md px-2 py-1.5 text-xs focus:outline-none text-text-secondary"
                >
                    <option value="novel">Novel</option>
                    <option value="script">Script</option>
                </select>
                <button type="submit" disabled={!newNovelTitle.trim()} className="bg-accent text-white px-3 py-1.5 rounded-md hover:bg-sky-400 disabled:bg-slate-700 disabled:cursor-not-allowed flex-shrink-0 transition-colors"><PlusIcon /></button>
            </div>
          </form>
          <ul className="space-y-1">
            {novels.map((novel) => (
              <EditableListItem
                  key={novel.id}
                  item={novel}
                  isActive={activeNovelId === novel.id}
                  onSelect={onNovelSelect}
                  onUpdate={(id, title) => onUpdateNovelDetails(id, { title })}
                  onDelete={onDeleteNovel}
                  className=""
                  activeClassName="bg-accent/10 text-accent border-accent/20"
              />
            ))}
          </ul>
        </div>

        {activeNovel && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="border-t border-white/5 pt-4 mb-6">
                <DailyGoalTracker novel={activeNovel} onGoalChange={handleGoalChange} />
            </div>
          
            <div className="border-t border-white/5 pt-4 mb-6">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 px-2">Details</h3>
              <div className="space-y-3 px-1">
                  <div className="flex justify-between items-center text-xs text-text-secondary bg-white/5 p-2 rounded">
                      <span className="font-mono">{activeNovel.type === 'script' ? 'MOVIE SCRIPT' : 'NOVEL'}</span>
                      {activeNovel.type !== 'script' && (
                          <button 
                            onClick={() => onConvertToScript(activeNovel.id)} 
                            className="flex items-center gap-1 text-[10px] bg-accent/20 text-accent hover:bg-accent/30 hover:text-white px-2 py-1 rounded transition-colors"
                            title="Convert Novel to Script"
                          >
                              <FilmIcon /> Convert to Script
                          </button>
                      )}
                  </div>
                  <div>
                      <input id="genre" name="genre" value={activeNovel.genre || ''} onChange={handleDetailChange} placeholder="Genre (e.g. Sci-Fi)" className="w-full bg-primary border border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-secondary/50"/>
                  </div>
                  <div>
                      <textarea id="logline" name="logline" value={activeNovel.logline || ''} onChange={handleDetailChange} placeholder="Logline / Summary..." rows={3} className="w-full bg-primary border border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-secondary/50 resize-none"></textarea>
                  </div>
              </div>
            </div>
          
            <div className="border-t border-white/5 pt-4 mb-6">
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
                 Books / Acts
              </h2>
              <form onSubmit={handleAddBook} className="flex gap-2 mb-3 px-1">
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  placeholder="New Book Title"
                  className="flex-grow bg-primary border border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button type="submit" disabled={!newBookTitle.trim()} className="bg-accent text-white px-3 py-1.5 rounded-md hover:bg-sky-400 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"><PlusIcon /></button>
              </form>
              <ul className="space-y-1">
                {(activeNovel.books || []).filter(b => !b.deletedAt).map((book) => (
                  <EditableListItem
                      key={book.id}
                      item={book}
                      isActive={activeBookId === book.id}
                      onSelect={onBookSelect}
                      onUpdate={onUpdateBookTitle}
                      onDelete={onDeleteBook}
                      className=""
                      activeClassName="bg-white/10 text-white font-semibold"
                  />
                ))}
              </ul>
            </div>

            {activeBook && (
                <div className="border-t border-white/5 pt-4 animate-in fade-in slide-in-from-left-4 duration-300">
                    <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
                         Chapters
                    </h2>
                    <form onSubmit={handleAddChapter} className="flex gap-2 mb-3 px-1">
                    <input
                        type="text"
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="New Chapter"
                        className="flex-grow bg-primary border border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button type="submit" disabled={!newChapterTitle.trim()} className="bg-accent text-white px-3 py-1.5 rounded-md hover:bg-sky-400 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"><PlusIcon /></button>
                    </form>
                    <ul className="space-y-1">
                    {(activeBook.chapters || []).filter(c => !c.deletedAt).map((chapter) => (
                        <EditableListItem
                            key={chapter.id}
                            item={chapter}
                            isActive={activeChapterId === chapter.id}
                            onSelect={onChapterSelect}
                            onUpdate={onUpdateChapterTitle}
                            onDelete={onDeleteChapter}
                            className=""
                            activeClassName="bg-white/10 text-accent font-semibold border-l-2 border-accent rounded-l-none"
                        />
                    ))}
                    </ul>
                </div>
            )}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 p-3 border-t border-white/5 bg-secondary/50">
        <div className="grid grid-cols-2 gap-2">
            <button onClick={onOpenSettings} className="p-2 rounded-md hover:bg-white/5 flex items-center justify-center gap-2 text-xs text-text-secondary hover:text-white transition-colors">
                <SettingsIcon /> Settings
            </button>
            <button onClick={onOpenImportExport} className="p-2 rounded-md hover:bg-white/5 flex items-center justify-center gap-2 text-xs text-text-secondary hover:text-white transition-colors">
                <ImportExportIcon /> Import/Export
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
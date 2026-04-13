import React, { useMemo } from 'react';
import { User } from 'firebase/auth';
import { Novel, NovelStatus } from '../types';
import { CloseIcon, LogoutIcon, UserCircleIcon, BookIcon, DocumentIcon, EditIcon } from './Icons';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  novels: Novel[];
  onLogout: () => void;
  onNavigateToNovel: (novelId: string) => void;
  onUpdateStatus: (novelId: string, status: NovelStatus) => void;
}

const ProjectCard: React.FC<{ novel: Novel, onNavigate: (id: string) => void, onStatusChange: (id: string, s: NovelStatus) => void }> = ({ novel, onNavigate, onStatusChange }) => {
    
    const stats = useMemo(() => {
        let chapterCount = 0;
        let wordCount = 0;
        (novel.books || []).forEach(book => {
            if(book.deletedAt) return;
            (book.chapters || []).forEach(chapter => {
                if(chapter.deletedAt) return;
                chapterCount++;
                wordCount += (chapter.wordCount || 0);
            });
        });
        return { chapterCount, wordCount };
    }, [novel]);

    const statusColors: Record<NovelStatus, string> = {
        'ongoing': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'completed': 'bg-green-500/20 text-green-400 border-green-500/30',
        'hiatus': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };

    return (
        <div className="group bg-secondary/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-accent/50 hover:bg-secondary/60 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5">
            <div>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-text-primary truncate pr-2" title={novel.title}>{novel.title}</h3>
                    <div className="relative">
                        <select 
                            value={novel.status || 'ongoing'} 
                            onChange={(e) => onStatusChange(novel.id, e.target.value as NovelStatus)}
                            className={`text-xs px-2.5 py-1 rounded-full cursor-pointer appearance-none outline-none border font-medium ${statusColors[novel.status || 'ongoing']} hover:brightness-110 transition-all`}
                        >
                            <option value="ongoing" className="bg-secondary text-text-primary">Ongoing</option>
                            <option value="completed" className="bg-secondary text-text-primary">Completed</option>
                            <option value="hiatus" className="bg-secondary text-text-primary">Hiatus</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-text-secondary uppercase tracking-wider">{novel.type === 'script' ? 'Script' : 'Novel'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-text-secondary mb-6 bg-primary/30 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2">
                        <BookIcon />
                        <span>{novel.books?.filter(b => !b.deletedAt).length || 0} {novel.type === 'script' ? 'Acts' : 'Books'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DocumentIcon />
                        <span>{stats.chapterCount} {novel.type === 'script' ? 'Scenes' : 'Chapters'}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-white/5 font-mono text-accent font-semibold flex justify-between items-center">
                        <span>Total Words</span>
                        <span>{stats.wordCount.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => onNavigate(novel.id)} 
                className="w-full mt-auto bg-white/5 hover:bg-accent text-text-primary hover:text-white py-2.5 rounded-lg transition-all font-medium flex items-center justify-center gap-2 group-hover:shadow-md"
            >
                <EditIcon /> Open Project
            </button>
        </div>
    );
};

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, user, novels, onLogout, onNavigateToNovel, onUpdateStatus }) => {
  if (!isOpen) return null;

  const totalWords = useMemo(() => {
    return novels.reduce((acc, novel) => {
        if(novel.deletedAt) return acc;
        return acc + (novel.books || []).reduce((bAcc, book) => {
            if(book.deletedAt) return bAcc;
            return bAcc + (book.chapters || []).reduce((cAcc, chapter) => {
                if(chapter.deletedAt) return cAcc;
                return cAcc + (chapter.wordCount || 0);
            }, 0);
        }, 0);
    }, 0);
  }, [novels]);

  const ongoingProjects = novels.filter(n => !n.deletedAt && (n.status === 'ongoing' || !n.status)).length;
  const completedProjects = novels.filter(n => !n.deletedAt && n.status === 'completed').length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="bg-primary rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] border border-white/10 overflow-hidden">
        <header className="flex justify-between items-center p-6 border-b border-white/5 bg-secondary/30">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Writer Profile</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close modal"><CloseIcon /></button>
        </header>
        
        <main className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* User Profile Section */}
            <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 bg-secondary/20 p-6 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex-shrink-0 flex flex-col items-center justify-center gap-3">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-24 h-24 rounded-full border-4 border-secondary shadow-lg object-cover" />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-text-secondary border-4 border-secondary shadow-lg">
                             <span className="transform scale-150"><UserCircleIcon /></span>
                        </div>
                    )}
                </div>
                <div className="flex-grow text-center md:text-left flex flex-col justify-center space-y-1">
                    <h3 className="text-2xl font-bold text-white tracking-tight">{user.displayName || 'Writer'}</h3>
                    <p className="text-text-secondary font-medium">{user.email}</p>
                    <div className="pt-3">
                         <button onClick={onLogout} className="text-red-400 hover:text-white flex items-center gap-2 mx-auto md:mx-0 border border-red-500/20 px-4 py-1.5 rounded-full text-sm hover:bg-red-500 transition-all duration-300">
                            <LogoutIcon /> Log Out
                        </button>
                    </div>
                </div>
                
                {/* Aggregate Stats */}
                <div className="flex gap-4 self-center w-full md:w-auto justify-center">
                    <div className="text-center p-4 bg-primary/50 rounded-xl border border-white/5 min-w-[110px]">
                        <div className="text-2xl font-bold text-accent font-mono">{totalWords.toLocaleString()}</div>
                        <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1 font-semibold">Total Words</div>
                    </div>
                    <div className="text-center p-4 bg-primary/50 rounded-xl border border-white/5 min-w-[110px]">
                        <div className="text-2xl font-bold text-blue-400 font-mono">{ongoingProjects}</div>
                        <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1 font-semibold">Ongoing</div>
                    </div>
                    <div className="text-center p-4 bg-primary/50 rounded-xl border border-white/5 min-w-[110px]">
                        <div className="text-2xl font-bold text-green-400 font-mono">{completedProjects}</div>
                        <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1 font-semibold">Completed</div>
                    </div>
                </div>
            </div>

            {/* Projects Section */}
            <div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-accent rounded-full"></span>
                    Your Projects
                </h3>
                
                {novels.filter(n => !n.deletedAt).length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10 text-text-secondary">
                        <p className="text-lg mb-2">You haven't created any projects yet.</p>
                        <p className="text-sm">Start your journey by creating a new novel or script in the sidebar.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {novels.filter(n => !n.deletedAt).map(novel => (
                            <ProjectCard 
                                key={novel.id} 
                                novel={novel} 
                                onNavigate={(id) => { onNavigateToNovel(id); onClose(); }} 
                                onStatusChange={onUpdateStatus}
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default AccountModal;
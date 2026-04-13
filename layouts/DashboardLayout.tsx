
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Novel, NovelType } from '../types';
import { PlusIcon, LogoutIcon, UserCircleIcon, SearchIcon, ShareIcon } from '../components/Icons';
import UserMenu from '../components/UserMenu';
import AccountModal from '../components/AccountModal';
import ShareModal from '../components/ShareModal';

const DashboardLayout: React.FC = () => {
    const { currentUser } = useAuth();
    const [novels, setNovels] = useState<Novel[]>([]);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState<NovelType>('novel');
    
    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedNovelForShare, setSelectedNovelForShare] = useState<Novel | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) return;
        const q = collection(db, 'users', currentUser.uid, 'novels');
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Novel));
            setNovels(data.filter(n => !n.deletedAt));
        });
        return unsub;
    }, [currentUser]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !newTitle.trim()) return;
        
        const newId = doc(collection(db, 'users')).id;
        const newProject: Novel = {
            id: newId,
            title: newTitle,
            type: newType,
            status: 'ongoing',
            logline: '',
            genre: '',
            books: [],
            dailyGoal: 500,
            writingHistory: {}
        };
        
        await setDoc(doc(db, 'users', currentUser.uid, 'novels', newId), newProject);
        navigate(`/novel/${newId}/editor`);
    };

    const openShareModal = (e: React.MouseEvent, novel: Novel) => {
        e.stopPropagation();
        setSelectedNovelForShare(novel);
        setIsShareModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-primary text-text-primary font-sans flex flex-col">
            <header className="border-b border-white/5 bg-secondary/50 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center gap-2">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent flex-grow truncate">Novel Helper</h1>
                    <div className="flex-shrink-0">
                        <UserMenu user={currentUser} onLogout={() => auth.signOut()} onOpenAccount={() => setIsAccountOpen(true)} />
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-6 md:py-8">
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 truncate">
                            Welcome, {currentUser?.displayName?.split(' ')[0] || 'Writer'}
                        </h2>
                        <p className="text-sm md:text-base text-text-secondary">Select a project or start a new journey.</p>
                    </div>
                    
                    <form onSubmit={handleCreateProject} className="flex gap-2 w-full md:w-auto bg-secondary/50 p-2 rounded-xl border border-white/5 shadow-lg">
                        <input 
                            type="text" 
                            placeholder="New Project Title..." 
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent flex-grow min-w-[140px]"
                        />
                        <select 
                            value={newType} 
                            onChange={e => setNewType(e.target.value as NovelType)}
                            className="bg-primary border border-white/10 rounded-lg px-2 py-2 text-xs md:text-sm focus:outline-none"
                        >
                            <option value="novel">Novel</option>
                            <option value="script">Script</option>
                        </select>
                        <button type="submit" disabled={!newTitle} className="bg-accent hover:bg-sky-400 text-white p-2 rounded-lg transition-colors shrink-0">
                            <PlusIcon />
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-10">
                    {novels.map(novel => (
                        <div 
                            key={novel.id} 
                            onClick={() => navigate(`/novel/${novel.id}/editor`)}
                            className="group bg-secondary border border-white/5 hover:border-accent/50 rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-accent/5 hover:-translate-y-1 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity flex gap-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider bg-black/20 px-2 py-1 rounded text-text-secondary group-hover:text-white">
                                    {novel.type}
                                </span>
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-white mb-2 pr-8 truncate">{novel.title}</h3>
                            <p className="text-sm text-text-secondary line-clamp-2 mb-4 h-10 leading-relaxed">
                                {novel.logline || "No logline set..."}
                            </p>
                            <div className="flex items-center justify-between text-[10px] md:text-xs text-text-secondary border-t border-white/5 pt-4">
                                <span>{(novel.books || []).reduce((acc, b) => acc + (b.chapters || []).length, 0)} Chapters</span>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => openShareModal(e, novel)}
                                        className="text-text-secondary hover:text-accent transition-colors"
                                        title="Share for Beta Readers"
                                    >
                                        <ShareIcon />
                                    </button>
                                    <span className={`capitalize ${novel.status === 'completed' ? 'text-green-400' : 'text-accent'}`}>{novel.status || 'Ongoing'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {novels.length === 0 && (
                        <div className="col-span-full py-12 md:py-20 text-center text-text-secondary border-2 border-dashed border-white/5 rounded-2xl">
                            <p className="text-lg">No projects yet.</p>
                            <p className="text-sm mt-1">Create one above to get started!</p>
                        </div>
                    )}
                </div>
            </main>

            <AccountModal 
                isOpen={isAccountOpen} 
                onClose={() => setIsAccountOpen(false)} 
                user={currentUser!} 
                novels={novels} 
                onLogout={() => auth.signOut()} 
                onNavigateToNovel={(id) => navigate(`/novel/${id}/editor`)}
                onUpdateStatus={async (id, status) => {
                    await setDoc(doc(db, 'users', currentUser!.uid, 'novels', id), { status }, { merge: true });
                }} 
            />

            {selectedNovelForShare && currentUser && (
                <ShareModal 
                    isOpen={isShareModalOpen} 
                    onClose={() => setIsShareModalOpen(false)} 
                    novel={selectedNovelForShare}
                    userId={currentUser.uid}
                />
            )}
        </div>
    );
};

export default DashboardLayout;

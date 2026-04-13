
import React, { useState, useEffect } from 'react';
import { Chapter, Book, Novel, BetaComment } from '../types';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BookIcon, DocumentIcon, CommentIcon, CloseIcon, UserIcon } from './Icons';

interface BetaReaderViewProps {
    novel: Novel;
}

const BetaReaderView: React.FC<BetaReaderViewProps> = ({ novel }) => {
    const [activeBookId, setActiveBookId] = useState<string | null>(novel.books[0]?.id || null);
    const [activeChapterId, setActiveChapterId] = useState<string | null>(novel.books[0]?.chapters[0]?.id || null);
    const [comments, setComments] = useState<BetaComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [readerName, setReaderName] = useState(() => localStorage.getItem('betaReaderName') || 'Guest Reader');
    const [selectedText, setSelectedText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeBook = novel.books.find(b => b.id === activeBookId);
    const activeChapter = activeBook?.chapters.find(c => c.id === activeChapterId);

    // Persist reader name
    useEffect(() => {
        localStorage.setItem('betaReaderName', readerName);
    }, [readerName]);

    // Load comments for this novel
    useEffect(() => {
        if (!novel.id) return;
        const q = query(collection(db, 'shared_novels', novel.id, 'comments'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BetaComment));
            setComments(loadedComments);
        });
        return () => unsubscribe();
    }, [novel.id]);

    const handleTextSelect = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            // Limit selection length for UX
            const text = selection.toString().trim();
            setSelectedText(text.length > 200 ? text.substring(0, 200) + '...' : text);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText || !activeChapterId) return;
        setIsSubmitting(true);

        try {
            await addDoc(collection(db, 'shared_novels', novel.id, 'comments'), {
                chapterId: activeChapterId,
                selectedText: selectedText,
                comment: commentText,
                readerName: readerName || 'Anonymous',
                timestamp: Date.now(),
                resolved: false
            });
            setCommentText('');
            setSelectedText('');
        } catch (error) {
            console.error("Error submitting comment:", error);
            alert("Could not submit comment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const chapterComments = comments.filter(c => c.chapterId === activeChapterId);

    return (
        <div className="flex h-screen bg-primary text-text-primary font-sans overflow-hidden">
            {/* Sidebar Toggle (Mobile) */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-secondary rounded-full shadow-lg border border-white/10 text-white"
            >
                {isSidebarOpen ? <CloseIcon /> : <BookIcon />}
            </button>

            {/* Sidebar Navigation */}
            <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-secondary border-r border-white/5 flex flex-col z-40 transform transition-transform duration-300 shadow-2xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-white/5 bg-secondary/50">
                    <h1 className="font-bold text-xl bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent truncate" title={novel.title}>
                        {novel.title}
                    </h1>
                    <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mt-1 block flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Beta Reader Mode
                    </span>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-6">
                    {novel.books.map(book => (
                        <div key={book.id}>
                            <h3 className="text-xs font-bold text-text-secondary px-3 mb-2 flex items-center gap-2 uppercase tracking-wide opacity-70">
                                {book.title}
                            </h3>
                            <ul className="space-y-1">
                                {book.chapters.map(chapter => (
                                    <li key={chapter.id}>
                                        <button 
                                            onClick={() => { setActiveChapterId(chapter.id); setActiveBookId(book.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-all ${activeChapterId === chapter.id ? 'bg-accent text-white font-medium shadow-lg shadow-accent/20 translate-x-1' : 'hover:bg-white/5 text-text-primary/80 hover:translate-x-1'}`}
                                        >
                                            <DocumentIcon /> 
                                            <span className="truncate">{chapter.title}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-white/5 bg-secondary/30">
                    <label className="block text-[10px] text-text-secondary uppercase font-bold mb-2 flex items-center gap-1">
                        <UserIcon /> Reading As
                    </label>
                    <input 
                        type="text" 
                        value={readerName} 
                        onChange={e => setReaderName(e.target.value)} 
                        placeholder="Your Name"
                        className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-text-secondary/30"
                    />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col h-full overflow-hidden relative bg-primary">
                {/* Overlay for mobile sidebar */}
                {isSidebarOpen && <div className="md:hidden absolute inset-0 bg-black/50 z-30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

                {activeChapter ? (
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Chapter Text */}
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-12 lg:px-24" onMouseUp={handleTextSelect}>
                            <div className="max-w-3xl mx-auto pb-32">
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl font-serif font-bold text-text-primary mb-2">{activeChapter.title}</h2>
                                    <div className="w-16 h-1 bg-accent/30 mx-auto rounded-full"></div>
                                </div>
                                <div 
                                    className={`prose prose-invert prose-lg max-w-none leading-relaxed selection:bg-accent/30 selection:text-white ${novel.type === 'script' ? 'font-script script-mode' : 'font-serif'}`}
                                    dangerouslySetInnerHTML={{ __html: activeChapter.content }}
                                />
                            </div>
                        </div>

                        {/* Comments Panel */}
                        <div className="w-full md:w-80 bg-secondary/5 border-l border-white/5 flex flex-col h-1/3 md:h-full backdrop-blur-sm relative z-20">
                            <div className="p-4 border-b border-white/5 bg-secondary/30 backdrop-blur-sm flex justify-between items-center">
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    <CommentIcon /> Discussion
                                </h3>
                                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full font-mono">{chapterComments.length}</span>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-secondary/5">
                                {chapterComments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-text-secondary opacity-60">
                                        <CommentIcon />
                                        <p className="text-sm mt-2 italic">Be the first to comment!</p>
                                    </div>
                                ) : (
                                    chapterComments.map(comment => (
                                        <div key={comment.id} className="bg-secondary p-3 rounded-xl border border-white/5 shadow-sm hover:border-white/10 transition-colors animate-fade-in">
                                            <div className="flex justify-between items-baseline mb-2">
                                                <span className="font-bold text-xs text-accent">{comment.readerName}</span>
                                                <span className="text-[10px] text-text-secondary opacity-70">{new Date(comment.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            {comment.selectedText && (
                                                <div className="mb-2 pl-2 border-l-2 border-accent/50 text-[10px] text-text-secondary italic line-clamp-3 bg-black/20 p-1 rounded-r">
                                                    "{comment.selectedText}"
                                                </div>
                                            )}
                                            <p className="text-xs text-text-primary leading-relaxed">{comment.comment}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleSubmitComment} className="p-4 border-t border-white/5 bg-secondary/30">
                                {selectedText && (
                                    <div className="mb-2 text-xs bg-accent/10 text-accent px-2 py-1 rounded border border-accent/20 flex justify-between items-center animate-slide-in">
                                        <span className="truncate max-w-[180px] italic">"{selectedText}"</span>
                                        <button type="button" onClick={() => setSelectedText('')} className="hover:text-white p-1"><CloseIcon /></button>
                                    </div>
                                )}
                                <textarea 
                                    value={commentText} 
                                    onChange={e => setCommentText(e.target.value)}
                                    placeholder={selectedText ? "Comment on selection..." : "Leave general feedback..."}
                                    className="w-full bg-primary border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[80px] resize-none placeholder:text-text-secondary/40"
                                />
                                <button type="submit" disabled={!commentText.trim() || isSubmitting} className="w-full mt-2 bg-accent text-white py-2 rounded-lg text-sm font-semibold hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/10 transition-all flex justify-center items-center gap-2">
                                    {isSubmitting ? <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span> : 'Post Comment'}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-text-secondary flex-col gap-4 opacity-50">
                        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-accent/50 animate-bounce">
                            <DocumentIcon />
                        </div>
                        <p className="font-medium">Select a chapter to start reading.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BetaReaderView;

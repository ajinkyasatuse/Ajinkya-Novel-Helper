
import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Editor from '../components/Editor';
import { EditIcon } from '../components/Icons';

const EditorPage: React.FC = () => {
    const { activeNovel, worldData, saveDocument, debouncedSaveDocument } = useProject();
    const { bookId, chapterId } = useParams();

    if (!activeNovel) return null;

    const activeBook = activeNovel.books.find(b => b.id === bookId);
    const activeChapter = activeBook?.chapters.find(c => c.id === chapterId);

    // Update handler tailored for Editor (Debounced)
    const handleUpdateChapter = (cId: string, updates: any) => {
        if (!activeBook) return;
        const updatedBooks = activeNovel.books.map(b => {
            if (b.id === activeBook.id) {
                return { ...b, chapters: b.chapters.map(c => c.id === cId ? { ...c, ...updates } : c) };
            }
            return b;
        });
        debouncedSaveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
    };

    // Manual Save Handler (Immediate)
    const handleManualSave = async (cId: string, updates: any) => {
        if (!activeBook) return;
        const updatedBooks = activeNovel.books.map(b => {
            if (b.id === activeBook.id) {
                return { ...b, chapters: b.chapters.map(c => c.id === cId ? { ...c, ...updates } : c) };
            }
            return b;
        });
        // Call saveDocument directly to bypass debounce
        return saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
    };

    if (!activeChapter) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center text-text-secondary p-8 text-center h-full">
                <div className="w-16 h-16 mb-4 rounded-full bg-secondary flex items-center justify-center text-accent">
                    <EditIcon />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">Ready to Write?</h3>
                <p className="max-w-md">Select a chapter from the sidebar or create a new book to get started.</p>
            </div>
        );
    }

    return (
        <Editor 
            key={activeChapter.id} // Important for resetting state on navigation
            chapter={activeChapter} 
            onUpdateChapter={handleUpdateChapter} 
            onManualSave={handleManualSave}
            novelType={activeNovel.type} 
            worldData={worldData as any}
            shareId={activeNovel.shareId} // Pass shareId for fetching beta comments
        />
    );
};

export default EditorPage;

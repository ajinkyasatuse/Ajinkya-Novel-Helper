
import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Corkboard from '../components/Corkboard';

const CorkboardPage: React.FC = () => {
    const { activeNovel, debouncedSaveDocument } = useProject();
    const { bookId } = useParams(); // Note: Corkboard usually needs a selected book context

    // For simplicity in this route structure, if no bookId in URL (likely case for /corkboard route), 
    // we default to first book or need UI to select. 
    // Ideally Route should be /novel/:id/corkboard/:bookId, but let's select first book active or from state.
    // In ProjectLayout sidebar, we can navigate to specific corkboard later.
    // For now, let's use the first non-deleted book if not specified.
    
    const activeBook = activeNovel?.books.find(b => !b.deletedAt); // Default to first book

    const handleUpdateChapters = (bId: string, chapters: any[]) => {
        if(!activeNovel) return;
        const updatedBooks = activeNovel.books.map(b => b.id === bId ? { ...b, chapters } : b);
        debouncedSaveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
    }

    if (!activeBook) return <div className="p-8 text-text-secondary">Please create a book first to view the Corkboard.</div>;

    return (
        <Corkboard 
            book={activeBook} 
            novel={activeNovel || undefined} 
            onUpdateChapters={handleUpdateChapters} 
            onSelectChapter={() => {}} // Could navigate to editor
        />
    );
};

export default CorkboardPage;

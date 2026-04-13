
import React from 'react';
import { useProject } from '../contexts/ProjectContext';
import MagicTimeline from '../components/MagicTimeline';

const TimelinePage: React.FC = () => {
    const { activeNovel, worldData, saveDocument } = useProject();

    // Timeline needs active book for context sometimes (auto-linking chapters)
    const activeBook = activeNovel?.books.find(b => !b.deletedAt);

    const handleUpdateEntity = (entity: any, type: string) => {
        const collectionMap: Record<string, string> = { 
            'Characters': 'characters', 'Regions': 'regions', 'Lore': 'lores', 
            'Events': 'events', 'All Items': 'items', 'Clans': 'clans', 
            'Creatures': 'creatures', 'Magical Things': 'magicalThings', 'Dialogs': 'dialogs' 
        };
        const colName = collectionMap[type] || 'customEntities';
        saveDocument(colName, entity.id, entity);
    };

    return (
        <MagicTimeline 
            worldData={worldData as any} 
            activeNovelId={activeNovel?.id || null} 
            activeBook={activeBook}
            onUpdateEntity={handleUpdateEntity}
        />
    );
};

export default TimelinePage;

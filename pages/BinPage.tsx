
import React, { useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';
import BinView from '../components/BinView';

const BinPage: React.FC = () => {
    const { activeNovel, worldData, saveDocument, deleteDocument } = useProject();

    const deletedItems = useMemo(() => {
        const base = {
            novels: [],
            books: [],
            chapters: [],
            characters: [],
            regions: [],
            lores: [],
            events: [],
            items: [],
            clans: [],
            creatures: [],
            magicalThings: [],
            dialogs: [],
            customEntities: []
        };

        if (!activeNovel) return base;
        
        return {
            ...base,
            books: activeNovel.books.filter(b => b.deletedAt),
            chapters: activeNovel.books.flatMap(b => b.chapters.filter(c => c.deletedAt)),
            characters: worldData.characters.filter(x => x.deletedAt),
            regions: worldData.regions.filter(x => x.deletedAt),
            lores: worldData.lores.filter(x => x.deletedAt),
            events: worldData.events.filter(x => x.deletedAt),
            items: worldData.items.filter(x => x.deletedAt),
            clans: worldData.clans.filter(x => x.deletedAt),
            creatures: worldData.creatures.filter(x => x.deletedAt),
            magicalThings: worldData.magicalThings.filter(x => x.deletedAt),
            dialogs: worldData.dialogs.filter(x => x.deletedAt),
            customEntities: worldData.customEntities.filter(x => x.deletedAt)
        };
    }, [activeNovel, worldData]);

    const handleRecover = (type: string, id: string) => {
        if (!activeNovel) return;
        
        // Novel Structure Recovery
        if (type === 'book') {
            const updatedBooks = activeNovel.books.map(b => b.id === id ? { ...b, deletedAt: undefined } : b);
            saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
        } else if (type === 'chapter') {
            const updatedBooks = activeNovel.books.map(b => ({
                ...b,
                chapters: b.chapters.map(c => c.id === id ? { ...c, deletedAt: undefined } : c)
            }));
            saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
        } else {
            // World Entity Recovery
            // Need to find the entity in worldData to get its full object to save back without deletedAt
            const list = (worldData as any)[type + 's'] || (worldData as any)[type]; // handle pluralization roughly
            // A safer way: map type to collection name
             const collectionMap: Record<string, string> = { 
                'character': 'characters', 'region': 'regions', 'lore': 'lores', 
                'event': 'events', 'item': 'items', 'clan': 'clans', 
                'creature': 'creatures', 'magicalThing': 'magicalThings', 'dialog': 'dialogs' 
            };
            const colName = collectionMap[type] || 'customEntities';
            const entity = (worldData as any)[colName]?.find((e: any) => e.id === id);
            
            if (entity) {
                const { deletedAt, ...rest } = entity;
                saveDocument(colName, id, rest);
            }
        }
    };

    const handlePermanentlyDelete = (type: string, id: string) => {
         if (!activeNovel) return;
         if (type === 'book') {
             const updatedBooks = activeNovel.books.filter(b => b.id !== id);
             saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
         } else if (type === 'chapter') {
             const updatedBooks = activeNovel.books.map(b => ({
                 ...b,
                 chapters: b.chapters.filter(c => c.id !== id)
             }));
             saveDocument('novels', activeNovel.id, { ...activeNovel, books: updatedBooks });
         } else {
             const collectionMap: Record<string, string> = { 
                'character': 'characters', 'region': 'regions', 'lore': 'lores', 
                'event': 'events', 'item': 'items', 'clan': 'clans', 
                'creature': 'creatures', 'magicalThing': 'magicalThings', 'dialog': 'dialogs' 
            };
            const colName = collectionMap[type] || 'customEntities';
            deleteDocument(colName, id);
         }
    };

    return (
        <BinView 
            deletedItems={deletedItems} 
            onRecover={handleRecover} 
            onPermanentlyDelete={handlePermanentlyDelete} 
        />
    );
};

export default BinPage;

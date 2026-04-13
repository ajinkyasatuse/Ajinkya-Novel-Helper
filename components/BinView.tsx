import React from 'react';
import { Novel, Book, Chapter, BaseWorldEntity } from '../types';
import { RecoverIcon, TrashIcon } from './Icons';

type DeletedItems = {
    novels: Novel[];
    books: Book[];
    chapters: Chapter[];
    [key: string]: (Novel | Book | Chapter | BaseWorldEntity)[];
}

interface BinViewProps {
    deletedItems: DeletedItems;
    onRecover: (type: string, id: string) => void;
    onPermanentlyDelete: (type: string, id: string) => void;
}

const getTypeName = (type: string) => {
    switch (type) {
        case 'novels': return 'Novel';
        case 'books': return 'Book';
        case 'chapters': return 'Chapter';
        case 'characters': return 'Character';
        case 'regions': return 'Region';
        case 'lores': return 'Lore';
        case 'events': return 'Event';
        case 'items': return 'Item';
        case 'clans': return 'Clan';
        case 'creatures': return 'Creature';
        case 'magicalThings': return 'Magical Thing';
        default: return 'Item';
    }
};

const DeletedItem: React.FC<{ item: (Novel | Book | Chapter | BaseWorldEntity) & { deletedAt: number }, type: string, onRecover: () => void, onPermanentlyDelete: () => void }> = ({ item, type, onRecover, onPermanentlyDelete }) => {
    return (
        <div className="bg-secondary p-3 rounded-md flex items-center justify-between gap-4">
            <div className="flex-grow overflow-hidden">
                <p className="font-semibold truncate">{(item as any).title || (item as any).name}</p>
                <p className="text-xs text-text-secondary">
                    {getTypeName(type)} | Deleted: {new Date(item.deletedAt).toLocaleString()}
                </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                <button onClick={onRecover} className="p-2 rounded-md bg-green-600 text-white hover:bg-green-500 flex items-center gap-1 text-sm" aria-label={`Recover ${(item as any).title || (item as any).name}`}>
                    <RecoverIcon />
                    <span className="hidden sm:inline">Recover</span>
                </button>
                <button onClick={onPermanentlyDelete} className="p-2 rounded-md bg-red-600 text-white hover:bg-red-500" aria-label={`Permanently delete ${(item as any).title || (item as any).name}`}>
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
};

const BinView: React.FC<BinViewProps> = ({ deletedItems, onRecover, onPermanentlyDelete }) => {

    const allItems = Object.entries(deletedItems)
        .flatMap(([type, items]) => {
            if (Array.isArray(items)) {
                return items.map(item => ({ ...item, __type: type }));
            }
            return [];
        })
        .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

    return (
        <div className="w-full h-full bg-primary flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-accent">Bin</h1>
                <p className="text-text-secondary mt-1">Items you delete are moved here. You can restore them or delete them forever.</p>
            </div>

            {allItems.length > 0 ? (
                <div className="space-y-3">
                    {allItems.map(item => {
                        const typeForCallback = ['novels', 'books', 'chapters'].includes(item.__type)
                            ? item.__type.slice(0, -1)
                            : item.__type;
                        return (
                            <DeletedItem
                                key={`${item.__type}-${item.id}`}
                                item={item as (Novel | Book | Chapter | BaseWorldEntity) & { deletedAt: number }}
                                type={item.__type}
                                onRecover={() => onRecover(typeForCallback, item.id)}
                                onPermanentlyDelete={() => onPermanentlyDelete(typeForCallback, item.id)}
                            />
                        );
                    })}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-text-secondary">The Bin is empty.</p>
                </div>
            )}
        </div>
    );
};

export default BinView;
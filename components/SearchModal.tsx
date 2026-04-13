import React from 'react';
import GlobalSearch from './GlobalSearch';
import { WorldEntityType } from '../types';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    worldData: any;
    onSelect: (entity: WorldEntityType & { __type: string, targetPath?: string, snippet?: string }) => void;
    disabled?: boolean;
    novelId?: string;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, ...props }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-40 p-4 pt-24" 
            role="dialog" 
            aria-modal="true" 
            onClick={onClose}
        >
            <div 
                className="bg-primary rounded-lg shadow-xl w-full max-w-lg" 
                onClick={(e) => e.stopPropagation()}
            >
                <GlobalSearch {...props} autoFocus />
            </div>
        </div>
    );
};

export default SearchModal;

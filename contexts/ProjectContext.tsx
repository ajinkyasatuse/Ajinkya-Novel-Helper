
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { Novel, Character, Region, Lore, Event, Item, Clan, Creature, MagicalThing, Dialog, CustomEntity, WorldEntityType, Poem, Quote } from '../types';

// Types for the Context
interface ProjectContextType {
  activeNovel: Novel | null;
  worldData: {
    characters: Character[];
    regions: Region[];
    lores: Lore[];
    events: Event[];
    items: Item[];
    clans: Clan[];
    creatures: Creature[];
    magicalThings: MagicalThing[];
    dialogs: Dialog[];
    poems: Poem[];
    quotes: Quote[];
    customEntities: CustomEntity[];
  };
  saveDocument: (collectionName: string, docId: string, data: any) => Promise<void>;
  debouncedSaveDocument: (collectionName: string, docId: string, data: any) => void;
  deleteDocument: (collectionName: string, docId: string) => Promise<void>;
  saveStatus: 'saved' | 'unsaved' | 'saving' | 'error';
  lastSave: Date | null;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within a ProjectProvider");
  return context;
};

// Generic Hook for Data Fetching
const useProjectCollection = <T extends { id: string, novelId: string }>(
    collectionName: string,
    userId: string | undefined,
    novelId: string | undefined
): T[] => {
    const [data, setData] = useState<T[]>([]);

    useEffect(() => {
        if (!userId || !novelId) {
            setData([]);
            return;
        }
        
        // Fetch ALL items from the user's collection, then filter locally by novelId.
        const q = collection(db, 'users', userId, collectionName);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as T))
                .filter(item => item.novelId === novelId); // Filter for THIS project
            setData(items);
        }, (err) => console.error(err));

        return () => unsubscribe();
    }, [userId, novelId, collectionName]);

    return data;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { novelId } = useParams<{ novelId: string }>();
  const { currentUser } = useAuth();
  const [activeNovel, setActiveNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved');
  const [lastSave, setLastSave] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  // 1. Fetch the Active Novel itself
  useEffect(() => {
    if (!currentUser || !novelId) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid, 'novels', novelId), (doc) => {
        if (doc.exists()) {
            setActiveNovel({ id: doc.id, ...doc.data() } as Novel);
        } else {
            setActiveNovel(null); // Handle 404
        }
        setLoading(false);
    });
    return unsub;
  }, [currentUser, novelId]);

  // 2. Fetch World Data associated with this Novel
  const characters = useProjectCollection<Character>('characters', currentUser?.uid, novelId);
  const regions = useProjectCollection<Region>('regions', currentUser?.uid, novelId);
  const lores = useProjectCollection<Lore>('lores', currentUser?.uid, novelId);
  const events = useProjectCollection<Event>('events', currentUser?.uid, novelId);
  const items = useProjectCollection<Item>('items', currentUser?.uid, novelId);
  const clans = useProjectCollection<Clan>('clans', currentUser?.uid, novelId);
  const creatures = useProjectCollection<Creature>('creatures', currentUser?.uid, novelId);
  const magicalThings = useProjectCollection<MagicalThing>('magicalThings', currentUser?.uid, novelId);
  const dialogs = useProjectCollection<Dialog>('dialogs', currentUser?.uid, novelId);
  const poems = useProjectCollection<Poem>('poems', currentUser?.uid, novelId);
  const quotes = useProjectCollection<Quote>('quotes', currentUser?.uid, novelId);
  const customEntities = useProjectCollection<CustomEntity>('customEntities', currentUser?.uid, novelId);

  // 3. Saving Logic
  const saveDocument = useCallback(async (collectionName: string, docId: string, data: any) => {
    if (!currentUser) return;
    setSaveStatus('saving');
    try {
        // IMPORTANT: Use { merge: true } to allows partial updates (e.g. from AI Assistant) without wiping other fields
        await setDoc(doc(db, 'users', currentUser.uid, collectionName, docId), data, { merge: true });
        setSaveStatus('saved');
        setLastSave(new Date());
    } catch (error) {
        console.error(`Error saving to ${collectionName}:`, error);
        setSaveStatus('error');
        throw error; // Re-throw to allow components to catch
    }
  }, [currentUser]);

  const debouncedSaveDocument = useCallback((collectionName: string, docId: string, data: any) => {
    const key = `${collectionName}-${docId}`;
    setSaveStatus('unsaved'); 
    
    if (saveTimeoutRef.current[key]) clearTimeout(saveTimeoutRef.current[key]);

    saveTimeoutRef.current[key] = setTimeout(async () => {
        await saveDocument(collectionName, docId, data);
        delete saveTimeoutRef.current[key];
    }, 2000); 
  }, [saveDocument]);

  const deleteDocument = useCallback(async (collectionName: string, docId: string) => {
      if(!currentUser) return;
      await deleteDoc(doc(db, 'users', currentUser.uid, collectionName, docId));
  }, [currentUser]);

  const worldData = { characters, regions, lores, events, items, clans, creatures, magicalThings, dialogs, poems, quotes, customEntities };

  return (
    <ProjectContext.Provider value={{ activeNovel, worldData, saveDocument, debouncedSaveDocument, deleteDocument, saveStatus, lastSave, loading }}>
      {children}
    </ProjectContext.Provider>
  );
};

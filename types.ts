
export interface ChapterVersion {
  timestamp: number;
  content: string;
}

export interface Scene {
  id: string;
  title: string;
  content: string;
  wordCount: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  outline: Scene[];
  wordCount: number;
  notes?: string;
  deletedAt?: number;
  versionHistory?: ChapterVersion[];
  // New: Tension and Sentiment for Story Arc Graph
  tensionScore?: number; // 1-10
  sentimentScore?: number; // -1 to 1
}

export interface Book {
  id: string;
  title: string;
  chapters: Chapter[];
  deletedAt?: number;
}

export type NovelType = 'novel' | 'script';
export type NovelStatus = 'ongoing' | 'completed' | 'hiatus';

export interface Novel {
  id: string;
  title: string;
  logline: string;
  genre: string;
  type?: NovelType; 
  status?: NovelStatus; 
  books: Book[];
  dailyGoal?: number;
  writingHistory?: { [date: string]: number }; 
  deletedAt?: number;
  // New: Beta Reader Config
  shareId?: string;
  isShared?: boolean;
}

export interface Connection {
    targetId: string; 
    type: string;
    description?: string;
}

export interface MapPin {
    id: string;
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    label: string;
    linkedEntityId?: string; // Link to another Region or Character
    description?: string;
}

export interface BaseWorldEntity {
    id: string;
    novelId: string;
    name: string;
    description: string;
    category?: string; 
    imageUrl?: string; 
    location?: string;
    connections?: Connection[];
    deletedAt?: number;
}

export interface Character extends BaseWorldEntity {
    role?: string;
    goal?: string;
    conflict?: string;
    race?: string;
    gender?: string;
    birthplace?: string; 
    occupation?: string;
    achievements?: string;
    powers?: string;
    ability?: string;
    skills?: string;
    connections: Connection[];
}

export interface Region extends BaseWorldEntity {
    mapImage?: string; // Base64 map
    mapPins?: MapPin[];
}

export interface Lore extends BaseWorldEntity {
    mainPlotRelevance?: string;
    subplotRelevance?: string;
}

export interface Event extends BaseWorldEntity {
    date?: string;
}

export interface Item extends BaseWorldEntity {
    type?: string;
}

export interface Clan extends BaseWorldEntity {
    homeland?: string; 
    members?: string[]; 
    history?: { date: string; description: string }[];
    achievements?: string;
}

export interface Creature extends BaseWorldEntity {
    homeland?: string; 
    race?: string;
    gender?: string;
    occupation?: string;
    achievements?: string;
    powers?: string;
    ability?: string;
    skills?: string;
    connections: Connection[];
}

export interface MagicalThing extends BaseWorldEntity {
}

export interface Dialog extends BaseWorldEntity {
    speakerId?: string; 
    content: string; 
    context?: string; 
    linkedLoreIds?: string[]; 
}

export interface CustomEntity extends BaseWorldEntity {
    customTabName: string; 
}

export interface Poem extends BaseWorldEntity {
    content: string;
    authorId?: string;
    context?: string;
}

export interface Quote extends BaseWorldEntity {
    content: string;
    speakerId?: string;
    context?: string;
}

export type WorldEntityType = Character | Region | Lore | Event | Item | Clan | Creature | MagicalThing | Dialog | CustomEntity | Poem | Quote;

export interface ConsistencyIssue {
    problematicText: string;
    issue: string;
    suggestions: string[];
}

export interface PlotTwist {
    title: string;
    description: string;
}

export interface BetaComment {
    id: string;
    chapterId: string;
    selectedText: string;
    comment: string;
    readerName: string;
    timestamp: number;
    resolved?: boolean; // New field
}

export type Theme = 'light' | 'ajinkya-dark' | 'instagram' | 'custom';

export interface TimelineNode {
    id: string;
    title: string;
    description?: string;
    date?: string; // In-world date
    characterIds?: string[];
    locationId?: string;
    chapterId?: string;
    type: 'event' | 'scene' | 'milestone';
    plotThreadId?: string;
}

export interface PlotThread {
    id: string;
    name: string;
    color: string; // Tailwind class or hex
    description?: string;
}

export interface StoryArc {
    id: string;
    title: string;
    description?: string;
    nodes: TimelineNode[];
    threads?: PlotThread[]; // Threads active in this arc
}

export interface AppBackup {
    novels: Novel[];
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
}

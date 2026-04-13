import { WorldEntityType, Chapter } from '../types';

export interface SearchResult {
    type: string;
    item: WorldEntityType | Chapter;
    matchType: 'name' | 'content' | 'description' | 'tag';
    snippet?: string;
    targetPath?: string;
}

export const searchDeepIndex = (
    query: string, 
    worldData: Record<string, any[]>, 
    chapters: Chapter[] = [],
    novelId?: string
): Record<string, SearchResult[]> => {
    if (!query || query.trim().length < 2) return {};

    const lowerQuery = query.toLowerCase().trim();
    const results: Record<string, SearchResult[]> = {};

    // Helper to add result
    const addResult = (type: string, item: any, matchType: SearchResult['matchType'], snippet?: string, targetPath?: string) => {
        if (!results[type]) results[type] = [];
        // Avoid duplicates
        if (!results[type].some(r => r.item.id === item.id)) {
            results[type].push({ type, item, matchType, snippet, targetPath });
        }
    };

    // 1. Search World Entities
    Object.entries(worldData).forEach(([type, items]) => {
        if (!Array.isArray(items)) return;
        
        items.forEach(item => {
            const name = item?.name?.toLowerCase() ?? "";
            const desc = item?.description?.toLowerCase() ?? "";
            const content = (item as any)?.content?.toLowerCase() ?? ""; // For poems/quotes/dialogs
            const category = item?.category?.toLowerCase() ?? "";

            // Determine target path based on type (simplified, mostly opens modal)
            // For now, we don't set targetPath for world items as they open in modal
            // But if we wanted deep linking:
            // const path = `/novel/${novelId}/world/${type}/${item.id}`;

            if (name.includes(lowerQuery)) {
                addResult(type, item, 'name');
            } else if (category.includes(lowerQuery)) {
                addResult(type, item, 'tag');
            } else if (desc.includes(lowerQuery)) {
                addResult(type, item, 'description', item.description?.substring(0, 100) + "...");
            } else if (content.includes(lowerQuery)) {
                addResult(type, item, 'content', (item as any).content?.substring(0, 100) + "...");
            }
        });
    });

    // 2. Search Chapters
    chapters.forEach(chapter => {
        const title = chapter?.title?.toLowerCase() ?? "";
        const content = chapter?.content?.toLowerCase() ?? "";
        
        // Construct path if novelId and bookId are available
        // Note: Chapter object in search might need bookId attached if flattened
        // But here we just have chapters list. We assume the caller handles finding bookId or it's attached.
        // If chapters are passed as flat list, we might need bookId in them.
        // Let's assume chapter object has bookId or we can't easily construct path here without context.
        // Actually, ProjectLayout passes chapters with bookTitle. Maybe we can attach bookId there?
        
        // For now, let's rely on ProjectLayout to construct the full path if missing, 
        // OR we try to construct it if we have the info.
        // The chapter object passed here comes from worldData.chapters which ProjectLayout constructs.
        // In ProjectLayout: ...chapters: activeNovel?.books?.flatMap(b => b.chapters?.map(c => ({...c, bookTitle: b.title, bookId: b.id})))
        
        const bookId = (chapter as any).bookId;
        const targetPath = (novelId && bookId) ? `/novel/${novelId}/editor/${bookId}/${chapter.id}` : undefined;

        if (title.includes(lowerQuery)) {
            addResult('chapters', chapter, 'name', undefined, targetPath);
        } else if (content.includes(lowerQuery)) {
            // Find snippet around match
            const idx = content.indexOf(lowerQuery);
            const start = Math.max(0, idx - 40);
            const end = Math.min(content.length, idx + 60);
            const snippet = "..." + chapter.content.substring(start, end) + "...";
            addResult('chapters', chapter, 'content', snippet, targetPath);
        }
    });

    return results;
};

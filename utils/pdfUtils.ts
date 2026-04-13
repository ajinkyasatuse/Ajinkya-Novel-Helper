
import { Novel, Chapter, Book, Character, Region, Lore, Event, Item, Clan, Creature, MagicalThing } from '../types';

declare const pdfjsLib: any;
declare const jspdf: any;

export const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = async (event) => {
            try {
                if (!event.target?.result) {
                    return reject(new Error("Failed to read file."));
                }

                // Ensure PDF.js is loaded
                if (typeof pdfjsLib === 'undefined') {
                    return reject(new Error("PDF.js library not loaded. Please refresh the page."));
                }

                // Explicitly set worker source if not already set correctly, 
                // using the same version as the library to prevent version mismatch errors.
                // We use 3.11.174 to match index.html CDN.
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }

                const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
                
                // Loading document
                const loadingTask = pdfjsLib.getDocument({
                    data: typedarray,
                    // Use system fonts to reduce worker failures on weird PDFs
                    disableFontFace: false 
                });

                const pdf = await loadingTask.promise;
                let fullText = '';

                // Iterate through pages
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    // Simple text concatenation
                    const pageText = textContent.items
                        .map((item: any) => item.str)
                        .join(' ');
                    
                    fullText += pageText + '\n\n';
                }

                if (!fullText.trim()) {
                    reject(new Error("PDF appears to be empty or contains only images (scanned)."));
                } else {
                    resolve(fullText);
                }

            } catch (error: any) {
                console.error("PDF Extraction Error:", error);
                // Clean up error message
                let msg = error.message;
                if (msg.includes("Fake worker") || msg.includes("Worker")) {
                    msg = "PDF Worker failed to load. Please check your internet connection or refresh the page.";
                }
                reject(new Error(msg));
            }
        };

        fileReader.onerror = (error) => {
            reject(error);
        };

        fileReader.readAsArrayBuffer(file);
    });
};

interface WorldData {
    characters: Character[];
    regions: Region[];
    lores: Lore[];
    events: Event[];
    items: Item[];
    clans: Clan[];
    creatures: Creature[];
    magicalThings: MagicalThing[];
}

interface PdfExportOptions {
    type: 'all' | 'book' | 'chapters';
    content: 'manuscript' | 'bible' | 'both';
    worldData?: WorldData;
    bookId?: string;
    startChapterId?: string;
    endChapterId?: string;
    pageSize: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
    fontSize?: number;
    includeTitlePage: boolean;
    includeBookTitles: boolean;
    includeChapterTitles: boolean;
    includeNotes?: boolean;
    includePageNumbers?: boolean;
}


// Helper to parse Script HTML
const parseScriptHtmlToPdf = (html: string, doc: any, startY: number, pageWidth: number, margin: number, lineHeight: number, checkPage: (h: number) => void) => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(dom.body.childNodes);
    let yPos = startY;
    
    // Script Layout Constants (points)
    // Assuming Courier Prime 12pt (~10cpi)
    const MARGIN_LEFT = margin;
    
    // Standard screenplay tabs (approximate for A4/Letter)
    const TAB_SCENE = MARGIN_LEFT;
    const TAB_ACTION = MARGIN_LEFT;
    const TAB_CHARACTER = MARGIN_LEFT + 200; // ~3.5 inches in
    const TAB_DIALOGUE = MARGIN_LEFT + 100; // ~2.5 inches in
    const TAB_PARENTHETICAL = MARGIN_LEFT + 150; // ~3.0 inches in
    const TAB_TRANSITION = pageWidth - margin - 100;

    const DIALOGUE_WIDTH = 250; // Constrain width for dialogue

    doc.setFont("Courier", "normal");
    doc.setFontSize(12);

    nodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const text = el.textContent || '';
            const className = el.className;
            
            if (!text.trim()) return;

            checkPage(lineHeight);
            
            if (className.includes('scene-heading')) {
                checkPage(lineHeight * 3); // Ensure space for scene heading and next line
                yPos += lineHeight; // Extra space before scene
                doc.setFont("Courier", "bold");
                doc.text(text.toUpperCase(), TAB_SCENE, yPos);
                yPos += lineHeight;
                doc.setFont("Courier", "normal");
            } else if (className.includes('character')) {
                checkPage(lineHeight * 2); // Keep char with dialogue
                yPos += lineHeight;
                doc.text(text.toUpperCase(), TAB_CHARACTER, yPos);
                yPos += lineHeight;
            } else if (className.includes('dialogue')) {
                const lines = doc.splitTextToSize(text, DIALOGUE_WIDTH);
                lines.forEach((line: string) => {
                    checkPage(lineHeight);
                    doc.text(line, TAB_DIALOGUE, yPos);
                    yPos += lineHeight;
                });
                yPos += lineHeight/2; // Slight spacing after dialogue block
            } else if (className.includes('parenthetical')) {
                checkPage(lineHeight);
                doc.text(text, TAB_PARENTHETICAL, yPos);
                yPos += lineHeight;
            } else if (className.includes('transition')) {
                checkPage(lineHeight);
                yPos += lineHeight;
                doc.text(text.toUpperCase(), TAB_TRANSITION, yPos, { align: 'right' });
                yPos += lineHeight;
            } else {
                // Action / Default
                const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
                lines.forEach((line: string) => {
                    checkPage(lineHeight);
                    doc.text(line, TAB_ACTION, yPos);
                    yPos += lineHeight;
                });
                yPos += lineHeight;
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
             // Fallback for plain text nodes
             const text = node.textContent?.trim();
             if (text) {
                 const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
                 lines.forEach((line: string) => {
                     checkPage(lineHeight);
                     doc.text(line, TAB_ACTION, yPos);
                     yPos += lineHeight;
                 });
                 yPos += lineHeight;
             }
        }
    });

    return yPos;
};


export const generateNovelPdf = (novel: Novel, options: PdfExportOptions) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'pt', // Use points for font sizes
        format: options.pageSize || 'a4',
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 72; // 1 inch in points
    const usableWidth = pageWidth - margin * 2;
    let yPos = margin;
    const isScript = novel.type === 'script';
    
    // Formatting variables
    const baseFontSize = options.fontSize || 12;
    const lineSpacing = isScript ? 12 : baseFontSize * 1.5;
    const titleFont = isScript ? "Courier" : "Times";
    const bodyFont = isScript ? "Courier" : "Times";

    const checkAndAddPage = (requiredHeight: number) => {
        if (yPos + requiredHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            return true;
        }
        return false;
    };

    // --- Title Page ---
    if (options.includeTitlePage !== false) {
        doc.setFont(titleFont, 'bold');
        doc.setFontSize(36);
        const titleLines = doc.splitTextToSize(novel.title, usableWidth);
        const titleHeight = titleLines.length * 40;
        doc.text(titleLines, pageWidth / 2, pageHeight / 3, { align: 'center' });
        
        doc.setFont(bodyFont, 'normal');
        doc.setFontSize(14);
        const byLine = `Written using Ajinkya Novel Helper`;
        doc.text(byLine, pageWidth / 2, pageHeight / 2, { align: 'center' });

        if (options.content === 'bible') {
            doc.setFontSize(18);
            doc.text(`World Bible`, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
        }
    }

    // --- MANUSCRIPT GENERATION ---
    if (options.content !== 'bible') {
        let chaptersToExport: { chapter: Chapter, bookTitle: string }[] = [];
        
        // ... (Logic to gather chapters remains the same)
        if (options.type === 'all') {
            novel.books.forEach(book => {
                if(!book.deletedAt) book.chapters.forEach(chapter => { if(!chapter.deletedAt) chaptersToExport.push({ chapter, bookTitle: book.title }); });
            });
        } else if (options.type === 'book' && options.bookId) {
            const book = novel.books.find(b => b.id === options.bookId);
            if (book) {
                book.chapters.forEach(chapter => { if(!chapter.deletedAt) chaptersToExport.push({ chapter, bookTitle: book.title }); });
            }
        } else if (options.type === 'chapters' && options.bookId && options.startChapterId && options.endChapterId) {
            const book = novel.books.find(b => b.id === options.bookId);
            if (book) {
                const startIndex = book.chapters.findIndex(c => c.id === options.startChapterId);
                const endIndex = book.chapters.findIndex(c => c.id === options.endChapterId);
                if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                     book.chapters.slice(startIndex, endIndex + 1).forEach(chapter => {
                         if(!chapter.deletedAt) chaptersToExport.push({ chapter, bookTitle: book.title });
                     });
                }
            }
        }

        chaptersToExport.forEach(({ chapter, bookTitle }, index) => {
            // New page for chapter
            if (options.includeTitlePage !== false || index > 0) {
                doc.addPage();
                yPos = margin;
            } else {
                // If no title page and first chapter, start at top margin
                yPos = margin;
            }

            if (options.includeBookTitles !== false && index === 0) { // Simplification: only show book title on first chapter of export block or change logic to track book change
                 // Better logic: track last book ID? For now, simple.
            }

            // Chapter Title
            if (options.includeChapterTitles !== false) {
                checkAndAddPage(50);
                doc.setFont(titleFont, 'bold');
                doc.setFontSize(18);
                doc.text(chapter.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
                yPos += 50;
            }
            
            doc.setFont(bodyFont, 'normal');
            doc.setFontSize(baseFontSize);

            if (isScript) {
                yPos = parseScriptHtmlToPdf(chapter.content, doc, yPos, pageWidth, margin, 14, (h) => {
                   if (checkAndAddPage(h)) {
                       doc.setFont("Courier", "normal");
                       doc.setFontSize(12);
                   }
                });
            } else {
                // Novel Prose
                // Basic cleanup of HTML. For improved rendering, consider a more robust HTML-to-Text parser
                const paragraphs = chapter.content.split(/<\/p>|<br\s*\/?>/i);
                
                paragraphs.forEach(p => {
                    const cleanText = p.replace(/<[^>]+>/g, '').trim();
                    if (!cleanText) return;

                    // First line indent for novels
                    const indent = "    "; // 4 spaces approx
                    const text = indent + cleanText;
                    
                    const lines = doc.splitTextToSize(text, usableWidth);
                    lines.forEach((line: string) => {
                        checkAndAddPage(lineSpacing);
                        doc.text(line, margin, yPos, { align: 'justify', maxWidth: usableWidth });
                        yPos += lineSpacing;
                    });
                    yPos += lineSpacing * 0.5; // Paragraph spacing
                });
            }
        });
    }

    // --- WORLD BIBLE GENERATION ---
    if (options.content !== 'manuscript' && options.worldData) {
        doc.addPage();
        yPos = margin;
        doc.setFont("Helvetica", 'bold');
        doc.setFontSize(24);
        doc.text("World Bible", pageWidth / 2, yPos, { align: 'center' });
        yPos += 50;

        const renderSection = (title: string, items: any[], renderer: (item: any) => void) => {
            if (!items || items.length === 0) return;
            
            checkAndAddPage(60);
            doc.setFillColor(240, 240, 240); // Light gray background for headers
            doc.rect(margin, yPos - 20, usableWidth, 30, 'F');
            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text(title.toUpperCase(), margin + 10, yPos);
            yPos += 30;
            
            items.forEach((item) => {
                checkAndAddPage(100); 
                renderer(item);
                yPos += 20; // Spacing between items
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPos, pageWidth - margin, yPos); // Divider
                yPos += 20;
            });
        };

        const renderField = (label: string, value: string) => {
             if(!value) return;
             doc.setFont("Helvetica", 'bold');
             doc.setFontSize(10);
             const labelWidth = doc.getTextWidth(label + ": ");
             checkAndAddPage(12);
             doc.text(label + ": ", margin, yPos);
             
             doc.setFont("Helvetica", 'normal');
             const valueLines = doc.splitTextToSize(value, usableWidth - labelWidth);
             doc.text(valueLines, margin + labelWidth, yPos);
             yPos += (valueLines.length * 12);
        };
        
        const renderDescription = (desc: string) => {
            if(!desc) return;
            yPos += 10;
            checkAndAddPage(14);
            doc.setFont("Times", 'italic');
            doc.setFontSize(11);
            const lines = doc.splitTextToSize(desc, usableWidth);
            lines.forEach((l: string) => {
                checkAndAddPage(14);
                doc.text(l, margin, yPos);
                yPos += 14;
            });
            doc.setFont("Helvetica", 'normal'); // Reset
        }

        // --- Render Logic ---
        const renderGenericEntity = (item: any) => {
            checkAndAddPage(60);
            
            // Layout: Image (optional) | Name + Type
            let textX = margin;
            let imageHeight = 0;

            if (item.imageUrl) {
                try {
                    const imgSize = 100;
                    if(pageHeight - yPos < imgSize) { doc.addPage(); yPos = margin; }
                    doc.addImage(item.imageUrl, 'PNG', margin, yPos, imgSize, imgSize);
                    textX += imgSize + 20;
                    imageHeight = imgSize;
                } catch (e) { /* ignore image error */ }
            }

            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(14);
            doc.text(item.name, textX, yPos + 12);
            
            // Sub-info (Dynamic Fields)
            let metaY = yPos + 30;
            doc.setFontSize(10);
            doc.setFont("Helvetica", "normal");

            const excludeKeys = ['id', 'novelId', 'name', 'description', 'imageUrl', 'connections', 'documents'];
            const keys = Object.keys(item).filter(k => !excludeKeys.includes(k) && typeof item[k] === 'string' && item[k]);

            keys.forEach(key => {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                const value = item[key];
                if (value.length > 50) return; // Skip long fields for meta section
                
                doc.setFont("Helvetica", "bold");
                doc.text(`${label}: `, textX, metaY);
                const labelWidth = doc.getTextWidth(`${label}: `);
                
                doc.setFont("Helvetica", "normal");
                doc.text(value, textX + labelWidth, metaY);
                metaY += 14;
            });
            
            // Push Y down past image or text, whichever is taller
            yPos = Math.max(yPos + Math.max(imageHeight, metaY - yPos) + 10, metaY + 10); 
            
            renderDescription(item.description);
            
            // Render Connections if any
            if (item.connections && item.connections.length > 0) {
                 yPos += 10;
                 checkAndAddPage(20);
                 doc.setFont("Helvetica", "bold");
                 doc.setFontSize(10);
                 doc.text("Connections:", margin, yPos);
                 yPos += 14;
                 doc.setFont("Helvetica", "normal");
                 item.connections.forEach((c: any) => {
                     checkAndAddPage(12);
                     doc.text(`- ${c.type}: ${c.targetName || 'Unknown'}`, margin + 10, yPos);
                     yPos += 12;
                 });
            }
        }

        renderSection("Characters", options.worldData.characters, renderGenericEntity);
        renderSection("Locations", options.worldData.regions, renderGenericEntity);
        renderSection("Lore", options.worldData.lores, renderGenericEntity);
        renderSection("Items", options.worldData.items, renderGenericEntity);
        renderSection("Clans", options.worldData.clans, renderGenericEntity);
        renderSection("Creatures", options.worldData.creatures, renderGenericEntity);
        renderSection("Magical Things", options.worldData.magicalThings, renderGenericEntity);
    }

    // --- Footer / Page Numbers ---
    if (options.includePageNumbers !== false) {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
        }
    }

    doc.save(`${novel.title.replace(/\s/g, '_')}_export.pdf`);
};

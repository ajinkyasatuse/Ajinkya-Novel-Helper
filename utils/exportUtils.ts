
import { Novel, Character, Region, Lore, Event, Item, Clan, Creature, MagicalThing } from '../types';

declare const docx: any;
declare const JSZip: any;

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

interface ExportOptions {
    type: 'all' | 'book' | 'chapters';
    content?: 'manuscript' | 'bible' | 'both';
    worldData?: WorldData;
    bookId?: string;
    startChapterId?: string;
    endChapterId?: string;
}

const getChaptersToExport = (novel: Novel, options: ExportOptions) => {
    let chaptersToExport: { chapter: any, bookTitle: string }[] = [];
    
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
    return chaptersToExport;
};

const saveFile = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// Helper to convert Base64 to Uint8Array for DOCX images
const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = window.atob(base64.split(',')[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Helper to sanitize XML content
const escapeXml = (unsafe: string): string => {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
        return c;
    });
};

// Script Parsing Helper for DOCX
const parseScriptHtmlToDocxParagraphs = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    const paragraphs: any[] = [];

    nodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const text = el.textContent || '';
            const className = el.className;
            
            if (!text.trim()) return;

            let indent: { left: number; right?: number } = { left: 0 };
            let spacing = { before: 200, after: 200 };
            let alignment = docx.AlignmentType.LEFT;
            let caps = false;
            let bold = false;

            // Twips (1/1440 inch). 1 inch = 1440 twips.
            if (className.includes('scene-heading')) {
                bold = true;
                caps = true;
                spacing = { before: 400, after: 200 };
            } else if (className.includes('character')) {
                indent = { left: 5300 }; // ~3.7 inches
                caps = true;
                spacing = { before: 300, after: 0 };
            } else if (className.includes('dialogue')) {
                indent = { left: 3600, right: 2000 }; // ~2.5 inches
                spacing = { before: 0, after: 200 };
            } else if (className.includes('parenthetical')) {
                indent = { left: 4400, right: 2500 }; // ~3.1 inches
                spacing = { before: 0, after: 0 };
            } else if (className.includes('transition')) {
                alignment = docx.AlignmentType.RIGHT;
                caps = true;
                spacing = { before: 300, after: 300 };
            }

            paragraphs.push(new docx.Paragraph({
                children: [new docx.TextRun({ text: text, bold: bold, allCaps: caps, font: "Courier Prime" })],
                indent: indent,
                spacing: spacing,
                alignment: alignment,
            }));
        } else if (node.nodeType === Node.TEXT_NODE) {
             const text = node.textContent?.trim();
             if (text) {
                 paragraphs.push(new docx.Paragraph({
                     children: [new docx.TextRun({ text: text, font: "Courier Prime" })]
                 }));
             }
        }
    });

    return paragraphs;
};

// --- DOCX Exporter ---
export const generateDocx = async (novel: Novel, options: ExportOptions) => {
    const sections = [];

    // --- Manuscript Section ---
    if (options.content !== 'bible') {
        const chaptersToExport = getChaptersToExport(novel, options);
        const children = [
            new docx.Paragraph({
                children: [new docx.TextRun({ text: novel.title, bold: true, size: 48 })],
                alignment: docx.AlignmentType.CENTER,
                spacing: { after: 800 } // Title page spacing
            }),
            new docx.Paragraph({
                children: [new docx.TextRun({ text: "Manuscript", size: 24, italics: true })],
                alignment: docx.AlignmentType.CENTER,
                spacing: { after: 400 },
                pageBreakBefore: false
            }),
        ];

        chaptersToExport.forEach(({ chapter }) => {
            children.push(
                new docx.Paragraph({
                    text: chapter.title,
                    heading: docx.HeadingLevel.HEADING_1,
                    pageBreakBefore: true,
                })
            );
            
            if (novel.type === 'script') {
                const scriptParas = parseScriptHtmlToDocxParagraphs(chapter.content);
                children.push(...scriptParas);
            } else {
                // Clean HTML tags for basic text and indent first line
                const paragraphs = chapter.content.split(/<\/p>|<br\s*\/?>/i);
                paragraphs.forEach((p: string) => {
                    const cleanText = p.replace(/<[^>]+>/g, '').trim();
                    if(cleanText) {
                        children.push(new docx.Paragraph({
                            children: [new docx.TextRun(cleanText)],
                            indent: { firstLine: 720 }, // 0.5 inch indent
                            spacing: { after: 200 }
                        }));
                    }
                });
            }
        });
        
        sections.push({
            properties: {},
            children: children,
        });
    }

    // --- World Bible Section ---
    if (options.content !== 'manuscript' && options.worldData) {
        const bibleChildren: any[] = [
            new docx.Paragraph({
                children: [new docx.TextRun({ text: "World Bible", bold: true, size: 48 })],
                alignment: docx.AlignmentType.CENTER,
                pageBreakBefore: options.content === 'both',
            }),
        ];

        const addEntityToDoc = (title: string, items: any[]) => {
            if(!items || items.length === 0) return;
            
            bibleChildren.push(
                new docx.Paragraph({
                    text: title,
                    heading: docx.HeadingLevel.HEADING_1,
                    pageBreakBefore: true,
                })
            );

            items.forEach(item => {
                // Name
                bibleChildren.push(new docx.Paragraph({
                    text: item.name,
                    heading: docx.HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                }));

                // Image
                if (item.imageUrl) {
                    try {
                        const imageBuffer = base64ToUint8Array(item.imageUrl);
                        const image = new docx.ImageRun({
                            data: imageBuffer,
                            transformation: { width: 200, height: 200 },
                        });
                        bibleChildren.push(new docx.Paragraph({ children: [image], spacing: { after: 200 } }));
                    } catch (e) {
                        console.error("Failed to add image to DOCX", e);
                    }
                }

                // Fields
                const fields: [string, string][] = [];
                if((item as Character).race) fields.push(["Race", (item as Character).race || '']);
                if((item as Region).location) fields.push(["Location", (item as Region).location || '']);
                
                fields.forEach(([key, val]) => {
                    if(val) {
                         bibleChildren.push(new docx.Paragraph({
                            children: [
                                new docx.TextRun({ text: `${key}: `, bold: true }),
                                new docx.TextRun(val)
                            ]
                        }));
                    }
                });

                // Description
                if (item.description) {
                     bibleChildren.push(new docx.Paragraph({
                        children: [new docx.TextRun({ text: item.description })],
                        spacing: { before: 100, after: 200 }
                    }));
                }
                
                // Separator
                bibleChildren.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: "---------------------------------" })],
                    alignment: docx.AlignmentType.CENTER,
                    spacing: { after: 200 }
                }));
            });
        };

        addEntityToDoc("Characters", options.worldData.characters);
        addEntityToDoc("Locations", options.worldData.regions);
        addEntityToDoc("Lore", options.worldData.lores);
        addEntityToDoc("Items", options.worldData.items);
        addEntityToDoc("Creatures", options.worldData.creatures);
        
        sections.push({
            properties: {},
            children: bibleChildren
        });
    }

    const doc = new docx.Document({
        styles: {
            paragraphStyles: [
                {
                    id: "Heading1",
                    name: "Heading 1",
                    basedOn: "Normal",
                    next: "Normal",
                    quickFormat: true,
                    run: { size: 32, bold: true, font: "Arial" },
                    paragraph: { spacing: { before: 240, after: 120 } },
                },
                {
                    id: "Heading2",
                    name: "Heading 2",
                    basedOn: "Normal",
                    next: "Normal",
                    quickFormat: true,
                    run: { size: 26, bold: true, font: "Arial" },
                    paragraph: { spacing: { before: 240, after: 120 } },
                },
                {
                    id: "Normal",
                    name: "Normal",
                    run: { font: "Times New Roman", size: 24 }, // 12pt
                }
            ]
        },
        sections: sections 
    });

    const blob = await docx.Packer.toBlob(doc);
    saveFile(blob, `${novel.title.replace(/\s/g, '_')}_${options.content || 'export'}.docx`);
};


// --- EPUB Exporter ---
export const generateEpub = async (novel: Novel, options: ExportOptions) => {
    const novelId = `urn:uuid:${Date.now()}`;
    const zip = new JSZip();

    // 1. mimetype file
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. container.xml
    const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    zip.folder("META-INF")?.file("container.xml", containerXML);

    const oebps = zip.folder("OEBPS");
    const imagesFolder = oebps?.folder("images");
    
    // Track resources
    const manifestItems: string[] = [];
    const spineItems: string[] = [];
    const navPoints: string[] = [];
    const addedImages = new Map<string, string>(); // base64 -> filename
    let imageCounter = 0;
    let playOrder = 1;

    // Helper to process image and add to ZIP
    const processImage = (base64: string | undefined): string | null => {
        if (!base64) return null;
        if (addedImages.has(base64)) return addedImages.get(base64)!;
        
        let extension = 'png';
        let mediaType = 'image/png';
        if (base64.startsWith('data:image/jpeg')) { extension = 'jpg'; mediaType = 'image/jpeg'; }
        
        const filename = `img-${++imageCounter}.${extension}`;
        const data = base64.split(',')[1];
        if(data) {
             imagesFolder?.file(filename, data, { base64: true });
             addedImages.set(base64, filename);
             manifestItems.push(`<item id="img-${imageCounter}" href="images/${filename}" media-type="${mediaType}"/>`);
             return filename;
        }
        return null;
    };

    // --- Manuscript Content ---
    if (options.content !== 'bible') {
        const chaptersToExport = getChaptersToExport(novel, options);
        chaptersToExport.forEach((item, index) => {
            const fileName = `chapter-${index + 1}.xhtml`;
            // Simple conversion
            const content = item.chapter.content
                .replace(/<br\s*\/?>/gi, '<br/>')
                .split('\n').map((p: string) => p.trim() ? `<p>${p}</p>` : '').join('');
            
            const chapterXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(item.chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(item.chapter.title)}</h1>
  ${content}
</body>
</html>`;
            oebps?.file(fileName, chapterXHTML);
            manifestItems.push(`<item id="chap-${index + 1}" href="${fileName}" media-type="application/xhtml+xml"/>`);
            spineItems.push(`<itemref idref="chap-${index + 1}"/>`);
            navPoints.push(`
    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder++}">
      <navLabel><text>${escapeXml(item.chapter.title)}</text></navLabel>
      <content src="${fileName}"/>
    </navPoint>`);
        });
    }

    // --- World Bible Content ---
    if (options.content !== 'manuscript' && options.worldData) {
        const sections = [
            { id: 'chars', title: 'Characters', items: options.worldData.characters },
            { id: 'locs', title: 'Locations', items: options.worldData.regions },
            { id: 'lore', title: 'Lore', items: options.worldData.lores },
            { id: 'events', title: 'Events', items: options.worldData.events },
            { id: 'items', title: 'Items', items: options.worldData.items },
            { id: 'clans', title: 'Clans', items: options.worldData.clans },
            { id: 'creatures', title: 'Creatures', items: options.worldData.creatures },
            { id: 'magic', title: 'Magical Things', items: options.worldData.magicalThings },
        ];

        sections.forEach((section) => {
            if (!section.items || section.items.length === 0) return;

            const fileName = `world-${section.id}.xhtml`;
            let htmlContent = `<h1 class="bible-header">${escapeXml(section.title)}</h1>`;

            section.items.forEach((item: any) => {
                htmlContent += `<div class="entity-card">`;
                htmlContent += `<h2>${escapeXml(item.name)}</h2>`;
                
                const imgFile = processImage(item.imageUrl);
                if (imgFile) {
                    htmlContent += `<div class="img-container"><img src="images/${imgFile}" alt="${escapeXml(item.name)}" /></div>`;
                }

                if (item.description) {
                    htmlContent += `<p class="desc">${escapeXml(item.description)}</p>`;
                }
                htmlContent += `</div><hr class="separator"/>`;
            });

            const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(section.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
            oebps?.file(fileName, xhtml);
            manifestItems.push(`<item id="sec-${section.id}" href="${fileName}" media-type="application/xhtml+xml"/>`);
            spineItems.push(`<itemref idref="sec-${section.id}"/>`);
            navPoints.push(`
    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder++}">
      <navLabel><text>${escapeXml(section.title)}</text></navLabel>
      <content src="${fileName}"/>
    </navPoint>`);
        });
    }

    // 4. CSS
    const css = `
    body { font-family: serif; line-height: 1.6; margin: 5%; } 
    h1 { text-align: center; margin-bottom: 2em; page-break-before: always; } 
    h2 { border-bottom: 2px solid #ccc; padding-bottom: 0.2em; margin-top: 2em; color: #333; }
    p { margin-bottom: 1em; text-indent: 1.5em; }
    .entity-card { margin-bottom: 2em; padding: 1em; background-color: #f9f9f9; border-radius: 5px; }
    .img-container { text-align: center; margin: 1em 0; }
    img { max-width: 100%; height: auto; border-radius: 5px; }
    hr.separator { border: 0; border-top: 1px dashed #bbb; margin: 2em 0; }
    .bible-header { color: #444; text-transform: uppercase; letter-spacing: 2px; }
    .desc { font-style: italic; color: #555; }
    `;
    oebps?.file("style.css", css);
    manifestItems.push(`<item id="css" href="style.css" media-type="text/css"/>`);

    // 5. content.opf
    const contentOPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(novel.title)}</dc:title>
    <dc:creator>Author</dc:creator>
    <dc:identifier id="book-id">${novelId}</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
    oebps?.file("content.opf", contentOPF);

    // 6. toc.ncx
    const tocNCX = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${novelId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(novel.title)}</text></docTitle>
  <navMap>
      ${navPoints.join('')}
  </navMap>
</ncx>`;
    oebps?.file("toc.ncx", tocNCX);

    // Generate and save
    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
    saveFile(blob, `${novel.title.replace(/\s/g, '_')}.epub`);
};

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Save, Sparkles, Wand2, Palette, Edit3, 
    Loader2, Bot, Type, Layers, Eye, Code2, Copy, 
    ExternalLink, AlertCircle, RotateCcw, CheckCircle2, Undo2, Redo2,
    ChevronDown, Image as ImageIcon, Search, RefreshCw, 
    ImagePlus, ChevronRight, ChevronLeft, Check, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Anchor,
    Pencil, Trash2, ChevronUp, ArrowUpDown, PaintBucket, Square, MousePointer2, Layout as LucideLayout, Plus, GripVertical
} from 'lucide-react';
import { updateLeadHtml } from '@/lib/actions/lead';
import { getStyleModels } from '@/lib/actions/ai';
import { getUserSettings } from '@/lib/actions/user-settings';
import { getBrandFolderAssets } from '@/lib/actions/brand-dna';
import { detectLeadLanguage } from '@/lib/i18n';
import { COLOR_PALETTES, STYLE_GROUPS } from '@/lib/editor/styles';
import { SECTION_SCHEMAS, SECTION_TEMPLATES } from '@/lib/templates/layout-templates';
import { LayoutIcon } from '@/lib/editor/layout-icons';

interface ForgeSection {
    id: string;
    key: string;
    index: number;
    label: string;
    swappable: boolean;
    requires: string;
    tag: string;
    html: string;
    visible: boolean;
}

const SECTION_ICONS: Record<string, string> = {
  navbar:       '◈',
  hero:         '◉',
  'trust-bar':  '◎',
  about:        '❋',
  services:     '⊞',
  gallery:      '⊟',
  testimonials: '◐',
  'why-us':     '◈',
  contact:      '⊕',
  footer:       '▣',
};

const SECTION_COLORS: Record<string, string> = {
  navbar:       '#6C63FF',
  hero:         '#EC4899',
  'trust-bar':  '#F59E0B',
  about:        '#06B6D4',
  services:     '#8B5CF6',
  gallery:      '#10B981',
  testimonials: '#F97316',
  'why-us':     '#3B82F6',
  contact:      '#22C55E',
  footer:       '#6B7280',
};

interface EditPageModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
    onSaveSuccess?: (newHtml: string) => void;
}

export default function EditPageModal({ isOpen, onClose, lead, onSaveSuccess }: EditPageModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const iframeContainerRef = useRef<HTMLDivElement>(null);
    const [styles, setStyles] = useState<any[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [modelId, setModelId] = useState('gemini-3-1-pro');
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isDirectEditEnabled, setIsDirectEditEnabled] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    const getInitialHtml = () => {
        if (!lead) return '';
        if (lead.viewVersion === 'real') {
            return lead.prototypeHtml || lead.htmlCode || '';
        }
        return lead.htmlCode || '';
    };

    const [previewHtml, setPreviewHtml] = useState<string>(getInitialHtml());
    const [revisionKey, setRevisionKey] = useState(0);
    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [sourceEditorDraft, setSourceEditorDraft] = useState<string>('');
    const [sourceEditorError, setSourceEditorError] = useState<string | null>(null);
    
    // --- Image Editor State ---
    const [detectedImages, setDetectedImages] = useState<{ 
        src: string, 
        id: string, 
        type: 'img' | 'bg', 
        resolution?: string,
        assetId?: string,
        sourceType?: 'img-tag' | 'inline-style' | 'tailwind-class' | 'css-rule',
        cssSelector?: string
    }[]>([]);
    const [activeImageId, setActiveImageId] = useState<string | null>(null);
    const [unsplashSearch, setUnsplashSearch] = useState('');
    const [unsplashResults, setUnsplashResults] = useState<{ id: string, urls: { regular: string, small: string }, alt_description: string, width: number, height: number }[]>([]);
    const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);
    const [activePanel, setActivePanel] = useState<'tools' | 'images' | 'sections' | 'ai-refine' | 'styles' | 'templates' | 'add-section'>('tools');
    const [activePalette, setActivePalette] = useState('Default');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [detectedSections, setDetectedSections] = useState<{ id: string, name: string, element: any }[]>([]);
    
    // --- Forge Section Manager State ---
    const [forgeSections, setForgeSections] = useState<ForgeSection[]>([]);
    const [insertSectionIdx, setInsertSectionIdx] = useState<number>(0);
    const dragIdxRef = useRef<number | null>(null);
    
    // --- Advanced Editor State ---
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [sectionInstruction, setSectionInstruction] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [originalSectionHtml, setOriginalSectionHtml] = useState<string | null>(null);
    const [appliedStyles, setAppliedStyles] = useState<Record<string, string>>({});
    const [schemaValues, setSchemaValues] = useState<Record<string, string>>({});
    const [aiProvider, setAiProvider] = useState<string>('kie');
    const [lastDebugInfo, setLastDebugInfo] = useState<{ prompt: string; response: string } | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [imageTab, setImageTab] = useState<'unsplash' | 'brand' | 'folder'>('unsplash');
    const [brandFolderFiles, setBrandFolderFiles] = useState<string[]>([]);
    const [isLoadingFolder, setIsLoadingFolder] = useState(false);
    const [folderSearch, setFolderSearch] = useState('');
    
    // --- History / Undo-Redo ---
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isHistoryUpdate, setIsHistoryUpdate] = useState(false);
    const codeHistoryTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce history for code editor
    useEffect(() => {
        if (!isCodeEditorOpen || isHistoryUpdate) return;
        
        if (codeHistoryTimerRef.current) clearTimeout(codeHistoryTimerRef.current);
        codeHistoryTimerRef.current = setTimeout(() => {
            pushToHistory(previewHtml);
        }, 1500);

        return () => {
            if (codeHistoryTimerRef.current) clearTimeout(codeHistoryTimerRef.current);
        };
    }, [previewHtml, isCodeEditorOpen, isHistoryUpdate]);

    // Refs for stable event listener access
    const isCodeEditorOpenRef = useRef(false);
    useEffect(() => { isCodeEditorOpenRef.current = isCodeEditorOpen; }, [isCodeEditorOpen]);
    
    const pushToHistory = useCallback((newHtml: string) => {
        if (isHistoryUpdate) return;
        setHistory(prev => {
            const nextHistory = prev.slice(0, historyIndex + 1);
            if (nextHistory[nextHistory.length - 1] === newHtml) return prev;
            return [...nextHistory, newHtml].slice(-20); // Keep last 20
        });
        setHistoryIndex(prev => Math.min(prev + 1, 19));
    }, [historyIndex, isHistoryUpdate]);

    const preprocessHtml = useCallback((html: string) => {
        if (!html) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const SELECTORS = 'section, header, footer, main, nav, [data-section]';
        doc.querySelectorAll(SELECTORS).forEach((el, i) => {
            if (!el.id) el.id = `__sec_${i}`;
        });
        
        doc.querySelectorAll('img, [style*="background-image"]').forEach((el, i) => {
            if (!el.id && !el.hasAttribute('data-asset-id')) {
                el.id = `__img_${i}`;
            }
        });
        
        return doc.documentElement.outerHTML;
    }, []);

    const showToast = useCallback((msg: string, type: 'success' | 'info' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const scanImages = useCallback(async (html: string) => {
        if (!html) return;
        setIsScanning(true);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const imgs: any[] = [];
        const seenSrcs = new Set<string>();

        try {
            // 1. Detect TEXT LOGO (Heuristic: first bold <a> in nav/header)
            const nav = doc.querySelector('nav, header');
            if (nav) {
                const textLogo = nav.querySelector('a.font-bold, a.font-black, a[class*="logo"]');
                if (textLogo && textLogo.textContent?.trim()) {
                    imgs.push({
                        src: '', // No src for text logo
                        id: (textLogo as HTMLElement).id || 'text-logo',
                        type: 'text-logo',
                        content: textLogo.textContent.trim(),
                        label: 'Text Logo'
                    });
                }
            }

            // 2. Scan for standard <img> tags
            doc.querySelectorAll('img').forEach((img, idx) => {
                const src = img.getAttribute('src');
                if (src && !src.startsWith('data:') && !seenSrcs.has(src)) {
                    seenSrcs.add(src);
                    const assetId = img.getAttribute('data-asset-id');
                    const elemId = img.id || (assetId ? `asset-${assetId}` : `img-${idx}`);
                    
                    // Identify if it's a logo
                    const isLogo = img.closest('nav, header') || 
                                   img.className.toLowerCase().includes('logo') || 
                                   img.id.toLowerCase().includes('logo') ||
                                   img.getAttribute('alt')?.toLowerCase().includes('logo');

                    imgs.push({ 
                        src, 
                        id: elemId, 
                        type: isLogo ? 'logo' : 'img', 
                        assetId,
                        sourceType: 'img-tag'
                    });
                }
            });

            // 3. Scan for background-image in inline styles
            doc.querySelectorAll('[style*="background-image"]').forEach((el, idx) => {
                const style = el.getAttribute('style') || '';
                const match = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
                if (match && match[1] && !match[1].startsWith('data:') && !seenSrcs.has(match[1])) {
                    const src = match[1];
                    seenSrcs.add(src);
                    const assetId = el.getAttribute('data-asset-id');
                    const elemId = (el as HTMLElement).id || (assetId ? `asset-${assetId}` : `bg-${idx}`);
                    imgs.push({ 
                        src, 
                        id: elemId, 
                        type: 'bg', 
                        assetId,
                        sourceType: 'inline-style'
                    });
                }
            });

            setDetectedImages(imgs);
        } catch (e) { console.error('Scan images error:', e); }
        finally { setIsScanning(false); }
    }, []);

    const scanSections = useCallback((html: string) => {
        if (!html) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sections: any[] = [];
        const seenIds = new Set<string>();
        
        doc.querySelectorAll('section, main, header, footer').forEach((el, idx) => {
            const id = el.id || `section-${idx}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            sections.push({ id, name: id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), element: el });
        });
        setDetectedSections(sections);

        // --- NEW: Forge Section Parser ---
        const elements = doc.querySelectorAll('[data-section]');
        const parsedForge: ForgeSection[] = [];
        elements.forEach(el => {
            const key   = el.getAttribute('data-section') || '';
            const index = parseInt(el.getAttribute('data-section-index') || '0');
            const label = el.getAttribute('data-section-label') || key;
            const swap  = el.getAttribute('data-swappable') !== 'false';
            const req   = el.getAttribute('data-requires') || 'none';
            const tag   = el.tagName.toLowerCase();
            
            // Ensure ID exists for reference
            if (!el.id) el.id = `section-${key}`;

            const isHidden = el.getAttribute('data-hidden') === 'true' || (el as HTMLElement).style.display === 'none';

            parsedForge.push({
                id: el.id,
                key, index, label, swappable: swap, requires: req, tag,
                html: el.outerHTML,
                visible: !isHidden, 
            });
        });
        parsedForge.sort((a,b) => a.index - b.index);
        setForgeSections(parsedForge);
    }, []);



    const handleSectionToggle = useCallback((sectionId: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        const el = doc.getElementById(sectionId);
        if (el) {
            const isHidden = el.getAttribute('data-hidden') === 'true' || el.style.display === 'none';
            if (isHidden) {
                el.removeAttribute('data-hidden');
                el.style.display = '';
            } else {
                el.setAttribute('data-hidden', 'true');
                el.style.display = 'none';
            }
            const finalHtml = doc.documentElement.outerHTML;
            setPreviewHtml(finalHtml);
            scanSections(finalHtml);
            pushToHistory(finalHtml);
            setRevisionKey(k => k + 1);
        }
    }, [previewHtml, scanSections, pushToHistory]);

    const handleSectionDragStart = (e: React.DragEvent, idx: number) => {
        if (!forgeSections[idx].swappable) { e.preventDefault(); return; }
        dragIdxRef.current = idx;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSectionDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleSectionDrop = (e: React.DragEvent, targetIdx: number) => {
        e.preventDefault();
        const from = dragIdxRef.current;
        if (from === null || from === targetIdx) return;

        if (!forgeSections[from].swappable) return;
        if (!forgeSections[targetIdx].swappable) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        const forgeEls = Array.from(doc.querySelectorAll('[data-section]'));
        
        const draggedEl = forgeEls[from];
        let targetEl = forgeEls[targetIdx];
        
        if (draggedEl && draggedEl.parentNode) {
            if (targetEl) {
                if (from < targetIdx) {
                    targetEl.parentNode.insertBefore(draggedEl, targetEl.nextSibling);
                } else {
                    targetEl.parentNode.insertBefore(draggedEl, targetEl);
                }
            } else {
                doc.body.appendChild(draggedEl);
            }
            
            const finalHtml = doc.documentElement.outerHTML;
            setPreviewHtml(finalHtml);
            scanSections(finalHtml);
            pushToHistory(finalHtml);
            setRevisionKey(k => k + 1);
        }

        dragIdxRef.current = null;
        showToast('Section direorder!', 'info');
    };

    const handleDeleteSection = useCallback((sectionId: string) => {
        if (!confirm('Are you sure you want to delete this section?')) return;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        const el = doc.getElementById(sectionId);
        if (el) {
            el.remove();
            const finalHtml = doc.documentElement.outerHTML;
            setPreviewHtml(finalHtml);
            scanSections(finalHtml);
            pushToHistory(finalHtml);
            setRevisionKey(k => k + 1);
        }
        
        showToast('Section deleted', 'info');
        if (selectedSection === sectionId) {
            setSelectedSection(null);
        }
    }, [previewHtml, pushToHistory, scanSections, selectedSection, showToast]);

    const handleAddSection = useCallback((templateType: string, templateHtml: string) => {
        const id = `section-${templateType}-${Date.now()}`;
        
        let newHtml = templateHtml;
        if (!newHtml.includes('id=')) {
            newHtml = newHtml.replace('<section', `<section id="${id}" data-section="${templateType}"`);
        } else {
            newHtml = newHtml.replace(/id="[^"]*"/, `id="${id}" data-section="${templateType}"`);
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        
        const forgeEls = Array.from(doc.querySelectorAll('[data-section]'));
        const targetEl = forgeEls[insertSectionIdx];

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtml;
        const newEl = tempDiv.firstElementChild;
        
        if (newEl) {
            if (targetEl && targetEl.parentNode) {
                targetEl.parentNode.insertBefore(newEl, targetEl.nextSibling);
            } else {
                const floatWa = doc.getElementById('forge-float-wa');
                if (floatWa && floatWa.parentNode) {
                    floatWa.parentNode.insertBefore(newEl, floatWa);
                } else {
                    doc.body.appendChild(newEl);
                }
            }
            
            const finalHtml = doc.documentElement.outerHTML;
            setPreviewHtml(finalHtml);
            scanSections(finalHtml);
            pushToHistory(finalHtml);
            setRevisionKey(k => k + 1);
        }
        
        setActivePanel('sections');
        showToast('Section added!', 'success');
        
        setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage({ type: 'SCROLL_TO', id }, '*');
        }, 300);
        
    }, [insertSectionIdx, previewHtml, pushToHistory, scanSections, showToast]);

    const handleSectionResetOrder = useCallback(() => {
        const original = preprocessHtml(getInitialHtml());
        setPreviewHtml(original);
        pushToHistory(original);
        setRevisionKey(k => k + 1);
        scanSections(original);
        
        if (iframeRef.current && iframeRef.current.contentDocument) {
            iframeRef.current.contentDocument.open();
            iframeRef.current.contentDocument.write(original);
            iframeRef.current.contentDocument.close();
        }
        showToast('Order di-reset ke versi awal', 'info');
    }, [getInitialHtml, preprocessHtml, pushToHistory, scanSections, showToast]);

    const detectSchema = useCallback((id: string) => {
        const idLower = id.toLowerCase();
        
        // Explicit check for navbar/header
        if (idLower.includes('nav') || idLower.includes('header')) return SECTION_SCHEMAS.navbar;
        
        // Heuristic: if it's the first major element in the body, it might be a navbar
        const iframeDoc = iframeRef.current?.contentDocument;
        if (iframeDoc) {
            const el = iframeDoc.getElementById(id);
            if (el && el.tagName === 'NAV' || (el?.parentElement?.tagName === 'BODY' && el?.previousElementSibling === null)) {
                 return SECTION_SCHEMAS.navbar;
            }
        }

        if (idLower.includes('hero')) return SECTION_SCHEMAS.hero;
        if (idLower.includes('contact')) return SECTION_SCHEMAS.contact;
        if (idLower.includes('footer') || idLower.includes('bottom')) return SECTION_SCHEMAS.footer;
        if (idLower.includes('about')) return SECTION_SCHEMAS.about;
        if (idLower.includes('service')) return SECTION_SCHEMAS.services;
        if (idLower.includes('gallery')) return SECTION_SCHEMAS.gallery;
        if (idLower.includes('team')) return SECTION_SCHEMAS.team;
        if (idLower.includes('faq')) return SECTION_SCHEMAS.faq;
        if (idLower.includes('stat')) return SECTION_SCHEMAS.stats;
        if (idLower.includes('process')) return SECTION_SCHEMAS.process;
        if (idLower.includes('trust') || idLower.includes('client') || idLower.includes('partner') || idLower.includes('brand')) return SECTION_SCHEMAS.trust;
        
        if (idLower.includes('testi') || idLower.includes('review') || idLower.includes('quote')) return SECTION_SCHEMAS.testimonial;
        if (idLower.includes('price') || idLower.includes('plan') || idLower.includes('cost')) return SECTION_SCHEMAS.pricing;
        if (idLower.includes('feature') || idLower.includes('benefit') || idLower.includes('grid')) return SECTION_SCHEMAS.feature;
        if (idLower.includes('cta') || idLower.includes('call') || idLower.includes('action')) return SECTION_SCHEMAS.cta;
        
        return null;
    }, []);

    const extractSchemaValuesWithFallback = useCallback((el: HTMLElement, schema: any) => {
        const values: Record<string, string> = {};
        
        schema.fields.forEach((f: any) => {
            // 1. Try specified selector
            const target = el.querySelector(f.selector);
            if (target && target.textContent?.trim() && target.textContent.trim().length > 1) {
                values[f.key] = target.textContent.trim();
                return;
            }
            
            // 2. Fallback heuristics based on key
            if (f.key === 'logo') {
                // Heuristic: Left-most prominent text in nav
                const links = Array.from(el.querySelectorAll('a, span, div')).filter(e => e.textContent?.trim());
                // Sort by horizontal position
                const best = links.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0];
                if (best) values[f.key] = best.textContent?.trim() || '';
            } else if (f.key === 'h1' || f.key === 'h2') {
                const candidates = Array.from(el.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="heading"], [class*="head"]'));
                const best = candidates.sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0];
                if (best) values[f.key] = best.textContent?.trim() || '';
            } else if (f.key === 'sub' || f.key === 'p' || f.key === 'copy') {
                const paras = Array.from(el.querySelectorAll('p, [class*="desc"], [class*="sub"], [class*="text"], span'));
                // Filter out short strings (likely buttons or nav items)
                const best = paras.filter(p => (p.textContent?.trim().length ?? 0) > 15)
                                  .sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0];
                if (best) values[f.key] = best.textContent?.trim() || '';
            } else if (f.key === 'quote') {
                const q = el.querySelector('blockquote, [class*="quote"], p');
                if (q) values[f.key] = q.textContent?.trim() || '';
            } else if (f.key === 'name') {
                const n = el.querySelector('strong, b, [class*="name"], [class*="author"], span.font-bold');
                if (n) values[f.key] = n.textContent?.trim() || '';
            }
            
            // 3. Fallback to label if still empty
            if (!values[f.key]) values[f.key] = f.label;
        });
        
        return values;
    }, []);


    const handleSetDirectEdit = useCallback((enabled: boolean) => {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!enabled && isDirectEditEnabled) {
            // Sync iframe content to state when disabling direct edit
            if (iframeDoc) {
                iframeDoc.body.contentEditable = 'false';
                iframeDoc.body.style.cursor = 'default';
                
                const syncedHtml = iframeDoc.documentElement.outerHTML;
                setPreviewHtml(syncedHtml);
                scanSections(syncedHtml);
                pushToHistory(syncedHtml);
            }
        } else if (enabled && !isDirectEditEnabled) {
            if (iframeDoc) {
                iframeDoc.body.contentEditable = 'true';
                iframeDoc.body.style.cursor = 'text';
            }
        }
        setIsDirectEditEnabled(enabled);
    }, [isDirectEditEnabled, pushToHistory, scanSections]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            setIsHistoryUpdate(true);
            const prevHtml = history[historyIndex - 1];
            setPreviewHtml(prevHtml);
            scanSections(prevHtml);
            setHistoryIndex(historyIndex - 1);
            setRevisionKey(k => k + 1);
            showToast("Undo", "info");
            setTimeout(() => setIsHistoryUpdate(false), 100);
        }
    }, [history, historyIndex, showToast]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setIsHistoryUpdate(true);
            const nextHtml = history[historyIndex + 1];
            setPreviewHtml(nextHtml);
            scanSections(nextHtml);
            setHistoryIndex(historyIndex + 1);
            setRevisionKey(k => k + 1);
            showToast("Redo", "info");
            setTimeout(() => setIsHistoryUpdate(false), 100);
        }
    }, [history, historyIndex, showToast]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    handleUndo();
                } else if (e.key === 'y' || (e.shiftKey && e.key === 'Z')) {
                    e.preventDefault();
                    handleRedo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    useEffect(() => {
        async function load() {
            try {
                const settings = await getUserSettings();
                if (settings?.aiProvider) {
                    setAiProvider(settings.aiProvider);
                    const defaultModel = settings.aiProvider === 'openrouter' ? 'deepseek-v4-pro' : 'gemini-3-1-pro';
                    setModelId(defaultModel);
                }
            } catch (e) { console.error(e); }
        }
        if (isOpen) {
            load();
            const rawHtml = getInitialHtml();
            const initialHtml = preprocessHtml(rawHtml);
            setPreviewHtml(initialHtml);
            setHistory([initialHtml]);
            setHistoryIndex(0);
            setRevisionKey(r => r + 1);
            setTimeout(() => {
                scanImages(initialHtml);
                scanSections(initialHtml);
            }, 100);
        }
    }, [isOpen, lead, scanImages, scanSections, preprocessHtml]);
    
    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const updateIframeContent = () => {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (iframeDoc) {
            const newHtml = iframeDoc.documentElement.outerHTML;
            setPreviewHtml(newHtml);
            scanSections(newHtml);
            pushToHistory(newHtml);
            setRevisionKey(k => k + 1);
        }
    };

    const handleReplaceImage = async (newSrc: string) => {
        if (!activeImageId) return;
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        
        // 1. Try exact ID (most reliable with preprocessHtml)
        let target = iframeDoc.getElementById(activeImageId);
        
        // 2. Try data-asset-id attribute
        if (!target) {
            const assetIdClean = activeImageId.replace(/^asset-/, '');
            target = iframeDoc.querySelector(`[data-asset-id="${assetIdClean}"]`);
        }
        
        // 3. Match by src URL as last resort
        if (!target) {
            const activeImg = detectedImages.find(i => i.id === activeImageId);
            if (activeImg?.src) {
                target = iframeDoc.querySelector(`img[src="${activeImg.src}"]`) ||
                         iframeDoc.querySelector(`img[src*="${activeImg.src.split('/').pop()}"]`);
            }
        }
        
        if (target) {
            if (target.tagName === 'IMG') {
                target.setAttribute('src', newSrc);
            } else {
                (target as HTMLElement).style.backgroundImage = `url(${newSrc})`;
            }
            updateIframeContent();
            showToast("Image replaced!", "success");
            setActiveImageId(null);
            setUnsplashResults([]);
            setTimeout(() => scanImages(previewHtml), 200);
        } else {
            showToast("Could not locate image in DOM", "info");
        }
    };

    // Stable ref so message listeners always call the latest version
    const searchUnsplashRef = useRef<(q: string) => Promise<void>>(async () => {});
    const searchUnsplash = useCallback(async (query: string) => {
        const q = query?.trim();
        if (!q) return;
        setIsSearchingUnsplash(true);
        try {
            const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
            const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&client_id=${accessKey}`);
            const data = await res.json();
            setUnsplashResults(data.results || []);
        } catch (e) { console.error('Unsplash search error:', e); }
        finally { setIsSearchingUnsplash(false); }
    }, []);
    useEffect(() => { searchUnsplashRef.current = searchUnsplash; }, [searchUnsplash]);

    const handleApplyTemplate = (templateHtml: string) => {
        if (!selectedSection) return;
        
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        
        const targetEl = iframeDoc.getElementById(selectedSection);
        if (!targetEl) return;

        // 1. Detect schema and extract current values
        const schema = detectSchema(selectedSection);
        if (!schema) {
            targetEl.outerHTML = templateHtml.replace('id="', `id="${selectedSection}" `);
            updateIframeContent();
            return;
        }

        const currentValues = extractSchemaValuesWithFallback(targetEl, schema);
        
        // Extract images and background images from old template
        const oldImages = Array.from(targetEl.querySelectorAll('img')).map(img => img.src).filter(Boolean);
        const oldBgUrls = Array.from(targetEl.querySelectorAll('[style*="background-image"]')).map(el => {
            const match = el.getAttribute('style')?.match(/url\(['"]?([^'"]+)['"]?\)/);
            return match ? match[1] : null;
        }).filter(Boolean);
        
        // 2. Inject current values into the new template
        let newHtml = templateHtml;
        Object.entries(currentValues).forEach(([key, val]) => {
            newHtml = newHtml.replace(new RegExp(`{{${key}}}`, 'g'), val as string);
        });
        
        // Clean up remaining unmatched placeholders
        newHtml = newHtml.replace(/\{\{[^}]+\}\}/g, '');

        // 3. Ensure the ID and data attributes are preserved
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtml;
        
        // Re-inject images if the new template has them
        if (oldImages.length > 0) {
            const newImages = Array.from(tempDiv.querySelectorAll('img'));
            newImages.forEach((img, i) => {
                if (oldImages[i]) img.src = oldImages[i];
            });
        }
        
        // Re-inject backgrounds
        if (oldBgUrls.length > 0) {
            const newBgElements = Array.from(tempDiv.querySelectorAll('[style*="background-image"], .bg-cover'));
            newBgElements.forEach((el, i) => {
                if (oldBgUrls[i]) {
                    (el as HTMLElement).style.backgroundImage = `url('${oldBgUrls[i]}')`;
                }
            });
        }

        const newEl = tempDiv.firstElementChild;
        if (newEl) {
            newEl.id = selectedSection;
            // Ensure all original data attributes (like data-section) are preserved so it doesn't disappear
            Array.from(targetEl.attributes).forEach(attr => {
                if (attr.name.startsWith('data-') && attr.name !== 'data-asset-id') {
                    newEl.setAttribute(attr.name, attr.value);
                }
            });
            
            targetEl.outerHTML = newEl.outerHTML;
            updateIframeContent();
            showToast("Layout structure updated", "success");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'media') => {
        const file = e.target.files?.[0];
        if (!file || !lead) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('leadId', lead.id);
        formData.append('type', type);

        setIsSaving(true);
        try {
            const res = await fetch('/api/editor/upload-asset', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                showToast(`${type === 'logo' ? 'Logo' : 'Media'} uploaded!`, 'success');
                // Auto replace if an image is active
                if (activeImageId && data.webpUrl) {
                    handleReplaceImage(data.webpUrl);
                }
            } else {
                showToast(data.error || 'Upload failed', 'info');
            }
        } catch (err) {
            console.error(err);
            showToast('Upload error', 'info');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'HTML_UPDATE') {
                setPreviewHtml(event.data.html);
                scanSections(event.data.html);
                setRevisionKey(k => k + 1);
            } else if (event.data?.type === 'SECTION_SELECT') {
                setSelectedSection(event.data.id);
                setActivePanel('ai-refine');
                // Slight delay so iframe DOM is fully rendered
                setTimeout(() => {
                    const iframeDoc = iframeRef.current?.contentDocument;
                    if (iframeDoc) {
                        const el = iframeDoc.getElementById(event.data.id);
                        if (el) {
                            setOriginalSectionHtml(el.outerHTML);
                            const schema = detectSchema(event.data.id);
                            if (schema) {
                                const values = extractSchemaValuesWithFallback(el, schema);
                                setSchemaValues(values);
                            }
                        }
                    }
                }, 50);
            } else if (event.data?.type === 'IMAGE_SELECT') {
                const query = lead?.category || 'modern business';
                setActiveImageId(event.data.id);
                setActivePanel('images');
                setImageTab('unsplash');
                setUnsplashSearch(query);
                // Use stable ref to avoid stale closure
                searchUnsplashRef.current(query);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lead, detectSchema]);

    useEffect(() => {
        if (activeImageId && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ 
                type: 'SCROLL_TO', 
                id: activeImageId 
            }, '*');
        }
    }, [activeImageId]);

    const getHtmlWithTrackerScript = (html: string) => {
        if (!html) return '';
        const trackerScript = `
            <script>
            const SELECTORS = 'section, header, footer, main, nav, [data-section]';
            // Iframe Tracker Redesign: No hover, only click and selection
            function assignIds() {
                document.querySelectorAll(SELECTORS).forEach((el, i) => {
                    if (!el.id) el.id = '__sec_' + i;
                });
                document.querySelectorAll('img, [style*="background-image"], .bg-cover, .bg-center').forEach((el, i) => {
                    if (!el.id && !el.hasAttribute('data-asset-id')) {
                        el.id = '__img_' + i;
                    }
                });
            }
            assignIds();


            document.body.addEventListener('click', (e) => {
                if (document.body.contentEditable === 'true') return;
                
                // If it's an image, don't trigger section click
                const imgTarget = e.target.closest('img, [style*="background-image"], .bg-cover, .bg-center');
                if (imgTarget) return; 

                const el = e.target.closest(SELECTORS);
                if (el) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({ type: 'SECTION_SELECT', id: el.id }, '*');
                }
            });

            // Listen for scroll commands from parent
            window.addEventListener('message', (e) => {
                if (e.data?.type === 'SCROLL_TO') {
                    const el = document.getElementById(e.data.id);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Brief highlight
                        const oldBoxShadow = el.style.boxShadow;
                        const oldTransition = el.style.transition;
                        el.style.transition = 'box-shadow 0.3s ease';
                        el.style.boxShadow = '0 0 0 4px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.5)';
                        setTimeout(() => {
                            el.style.boxShadow = oldBoxShadow;
                            setTimeout(() => el.style.transition = oldTransition, 300);
                        }, 1500);
                    }
                }
            });

            
            // Image tracking
            function trackImages() {
                document.querySelectorAll('img, [style*="background-image"], .bg-cover, .bg-center').forEach((el) => {
                    if (el.hasAttribute('data-img-tracked')) return;
                    
                    // Check if it actually has a background image if caught by class
                    const style = window.getComputedStyle(el);
                    const hasBg = style.backgroundImage && style.backgroundImage !== 'none';
                    if (el.tagName !== 'IMG' && !hasBg) return;

                    el.setAttribute('data-img-tracked', 'true');
                    el.style.cursor = 'pointer';
                    el.style.pointerEvents = 'auto'; // Force interaction
                    
                    el.addEventListener('click', (e) => {
                        if (document.body.contentEditable === 'true') return;
                        e.preventDefault();
                        e.stopPropagation();
                        
                        let src = '';
                        if (el.tagName === 'IMG') {
                            src = el.getAttribute('src') || '';
                        } else {
                            const bg = style.backgroundImage;
                            const match = bg.match(/url\(['"]?([^'"]+)['"]?\)/);
                            if (match) src = match[1];
                        }
                        
                        window.parent.postMessage({ 
                            type: 'IMAGE_SELECT', 
                            id: el.id || el.getAttribute('data-asset-id') || 'img-' + Math.random().toString(36).substr(2, 5),
                            src: src
                        }, '*');
                    });
                });
            }
            trackImages();

            if (${isDirectEditEnabled}) {
                document.body.contentEditable = 'true';
                document.body.style.cursor = 'text';
            }
        </script>
        `;
        return html + "\n" + trackerScript;
    };

    const applyTailwindStyle = (id: string, group: string, value: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        const el = doc.getElementById(id);
        if (!el) return;
        
        let className = el.className || '';
        const groupPatterns: any = {
            'padding-y': /\bpy-\d+/g,
            'bg': /\bbg-(white|black|zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d+)?\b/g,
            'text-color': /\btext-(white|black|zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d+)?\b/g,
            'rounded': /\brounded(-[a-z0-9]+)?\b/g,
        };
        if (groupPatterns[group]) className = className.replace(groupPatterns[group], '').trim();
        
        const newClassName = (className + ' ' + value).trim();
        el.className = newClassName;
        
        const iframeDoc = iframeRef.current?.contentDocument;
        if (iframeDoc) {
            const iframeEl = iframeDoc.getElementById(id);
            if (iframeEl) iframeEl.className = newClassName;
        }
        
        const doctypeStr = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '<!DOCTYPE html>';
        const newHtml = doctypeStr + '\n' + doc.documentElement.outerHTML;
        setPreviewHtml(newHtml);
        scanSections(newHtml);
        pushToHistory(newHtml);
        setAppliedStyles(prev => ({ ...prev, [group]: value }));
    };

    const handleRefineSection = async () => {
        if (!selectedSection || !originalSectionHtml || isRefining) return;
        setIsRefining(true);
        
        const richBrandContext = `
BUSINESS NAME: ${lead?.brandDna?.businessName || lead?.businessName || 'N/A'}
INDUSTRY/CATEGORY: ${lead?.category || 'N/A'}
BRAND VOICE/TONE: ${lead?.brandDna?.toneOfVoice || 'Professional, persuasive'}
PRIMARY AUDIENCE: ${lead?.brandDna?.primaryAudience || 'General potential customers'}
UNIQUE VALUE PROP: ${lead?.brandDna?.uniqueValueProposition || 'Quality products/services'}
CORE COLORS: ${lead?.brandDna?.brandColors ? lead.brandDna.brandColors.join(', ') : 'N/A'}

BUSINESS DESCRIPTION:
${lead?.description || 'N/A'}

CONTACT INFO (Use if applicable):
Phone: ${lead?.phone || 'N/A'}
Email: ${lead?.email || 'N/A'}

OVERALL SITE STRATEGY:
${lead?.masterWebsitePrompt || 'N/A'}
`.trim();

        const prompt = `Instruction: ${sectionInstruction}\nBrand Context Provided\nHTML: ${originalSectionHtml}`;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch('/api/live-editor/refine-section', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    sectionHtml: originalSectionHtml,
                    instruction: sectionInstruction,
                    brandContext: richBrandContext,
                    modelKey: modelId
                })
            });
            const data = await res.json();
            setLastDebugInfo({ prompt, response: data.refinedHtml || data.error || 'No response' });
            
            if (data.refinedHtml) {
                // More robust replacement using DOM parsing
                const parser = new DOMParser();
                const doc = parser.parseFromString(previewHtml, 'text/html');
                const el = doc.getElementById(selectedSection);
                if (el) {
                    // Create a temporary element to hold the new HTML and extract its first child
                    const temp = doc.createElement('div');
                    
                    // Cleanup conversational text that might wrap the HTML
                    let rawHtml = data.refinedHtml;
                    const match = rawHtml.match(/<([a-z0-9]+)[^>]*>[\s\S]*<\/\1>/i);
                    if (match) {
                        rawHtml = match[0];
                    }
                    
                    temp.innerHTML = rawHtml.trim();
                    const newEl = temp.firstElementChild as HTMLElement;
                    if (newEl) {
                        newEl.id = el.id; // PRESERVE ID!
                        el.replaceWith(newEl);
                        const newFullHtml = doc.documentElement.outerHTML;
                        setPreviewHtml(newFullHtml);
                        scanSections(newFullHtml);
                        pushToHistory(newFullHtml);
                        setRevisionKey(k => k + 1);
                        showToast("Section refined by AI!", "success");
                        setSectionInstruction('');
                        setOriginalSectionHtml(newEl.outerHTML); // Update original with actual new HTML
                    } else {
                        throw new Error("AI returned invalid HTML structure");
                    }
                } else {
                    // Fallback to simple replace if ID match fails (shouldn't happen)
                    const updatedHtml = previewHtml.replace(originalSectionHtml, data.refinedHtml);
                    setPreviewHtml(updatedHtml);
                    scanSections(updatedHtml);
                    setRevisionKey(k => k + 1);
                }
            } else if (data.error) {
                showToast(data.error, "info");
            }
        } catch (e: any) { 
            console.error(e);
            showToast("Refinement failed: " + e.message, "info");
        }
        finally { setIsRefining(false); }
    };

    const handleApplySchemaChanges = () => {
        if (!selectedSection) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        const el = doc.getElementById(selectedSection);
        if (!el) return;
        const schema = detectSchema(selectedSection);
        if (!schema) return;
        schema.fields.forEach(f => {
            const target = el.querySelector(f.selector);
            if (target) target.textContent = schemaValues[f.key] || '';
        });
        const newFullHtml = doc.documentElement.outerHTML;
        setPreviewHtml(newFullHtml);
        scanSections(newFullHtml);
        setRevisionKey(k => k + 1);
        showToast("Content updated", "success");
    };

    const handleSaveDirectHTML = async () => {
        setIsSaving(true);
        try {
            let htmlToSave = previewHtml;
            
            // Sync from iframe if we're in Type mode
            if (isDirectEditEnabled && iframeRef.current?.contentDocument) {
                htmlToSave = iframeRef.current.contentDocument.documentElement.outerHTML;
                setPreviewHtml(htmlToSave);
                scanSections(htmlToSave);
            }
            
            const res = await updateLeadHtml(lead.id, htmlToSave, lead.viewVersion || 'dummy');
            if (res.success) { 
                showToast("Changes saved!"); 
                if (onSaveSuccess) onSaveSuccess(htmlToSave);
            }
        } catch (e: any) { alert(e.message); }
        finally { setIsSaving(false); }
    };

    const COLOR_PALETTES: Record<string, { bg: string[], text: string[] }> = {
        'Default': {
            bg: ['bg-white', 'bg-zinc-50', 'bg-zinc-900', 'bg-black', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-400', 'bg-rose-500'],
            text: ['text-white', 'text-black', 'text-zinc-900', 'text-zinc-500', 'text-blue-600', 'text-amber-400', 'text-rose-500']
        },
        'Cyberpunk': {
            bg: ['bg-black', 'bg-zinc-950', 'bg-fuchsia-600', 'bg-cyan-400', 'bg-yellow-400', 'bg-purple-900'],
            text: ['text-white', 'text-cyan-400', 'text-fuchsia-400', 'text-yellow-400', 'text-black']
        },
        'Earthy Minimal': {
            bg: ['bg-[#FAF9F6]', 'bg-[#EAE6DF]', 'bg-[#8A9A5B]', 'bg-[#C19A6B]', 'bg-[#3E2723]', 'bg-white'],
            text: ['text-[#3E2723]', 'text-[#4E342E]', 'text-[#8A9A5B]', 'text-[#FAF9F6]', 'text-black']
        },
        'Corporate Blue': {
            bg: ['bg-white', 'bg-slate-50', 'bg-slate-900', 'bg-blue-900', 'bg-blue-600', 'bg-sky-500'],
            text: ['text-slate-900', 'text-slate-600', 'text-blue-900', 'text-blue-600', 'text-white']
        },
        'Sunset Glow': {
            bg: ['bg-[#FFF3E0]', 'bg-[#FFCC80]', 'bg-[#FF9800]', 'bg-[#E65100]', 'bg-[#880E4F]', 'bg-white'],
            text: ['text-[#880E4F]', 'text-[#E65100]', 'text-[#FF9800]', 'text-black', 'text-white']
        }
    };

    const applyPaletteToSite = () => {
        const palette = COLOR_PALETTES[activePalette];
        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        
        const sections = Array.from(doc.body.querySelectorAll('section, header, footer, [id^="hero"], [id^="feature"], [id^="contact"]'));
        
        sections.forEach((sec, index) => {
            const safeBgRemovePattern = /\bbg-(white|black|zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d+)?\b/g;
            const safeTextRemovePattern = /\btext-(white|black|zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d+)?\b/g;
            
            let className = sec.className;
            className = className.replace(safeBgRemovePattern, '').replace(safeTextRemovePattern, '').replace(/\s+/g, ' ').trim();
            
            const bgClass = palette.bg[index % Math.min(3, palette.bg.length)];
            const textClass = palette.text[index % Math.min(3, palette.text.length)];
            sec.className = `${className} ${bgClass} ${textClass}`.trim();
        });
        
        const newFullHtml = doc.documentElement.outerHTML;
        setPreviewHtml(newFullHtml);
        scanSections(newFullHtml);
        pushToHistory(newFullHtml);
        showToast(`Applied ${activePalette} theme to all sections!`, 'success');
    };

    const STYLE_GROUPS = [
        { label: 'Padding Vertical', group: 'padding-y', options: ['py-0', 'py-8', 'py-16', 'py-24', 'py-32'], icon: ArrowUpDown },
        { label: 'Background Color', group: 'bg', options: COLOR_PALETTES[activePalette].bg, icon: PaintBucket },
        { label: 'Text Color', group: 'text-color', options: COLOR_PALETTES[activePalette].text, icon: Type },
        { label: 'Rounding', group: 'rounded', options: ['rounded-none', 'rounded-lg', 'rounded-2xl', 'rounded-full'], icon: Square },
    ];



    if (!isOpen || !lead) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" onClick={onClose} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full h-full bg-[#050505] overflow-hidden flex flex-col">
                    <div className="h-16 shrink-0 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20"><Sparkles size={20} className="text-black" /></div>
                                <div><h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Pro Site Editor</h2><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Live Session Active</span></div></div>
                            </div>
                            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                                <button onClick={() => { handleSetDirectEdit(false); setIsCodeEditorOpen(false); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!isDirectEditEnabled && !isCodeEditorOpen ? 'bg-amber-500 text-black' : 'text-white/40'}`}>Visual</button>
                                <button onClick={() => handleSetDirectEdit(!isDirectEditEnabled)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${isDirectEditEnabled ? 'bg-amber-500 text-black' : 'text-white/40'}`}>Type</button>
                                <button onClick={() => { handleSetDirectEdit(false); setSourceEditorDraft(previewHtml); setSourceEditorError(null); setIsCodeEditorOpen(true); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${isCodeEditorOpen ? 'bg-amber-500 text-black' : 'text-white/40'}`}>Source</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                <button 
                                    onClick={handleUndo} 
                                    disabled={historyIndex <= 0}
                                    className="p-2.5 text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-20 transition-all border-r border-white/5"
                                    title="Undo (Ctrl+Z)"
                                >
                                    <Undo2 size={16} />
                                </button>
                                <button 
                                    onClick={handleRedo} 
                                    disabled={historyIndex >= history.length - 1}
                                    className="p-2.5 text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-20 transition-all"
                                    title="Redo (Ctrl+Y)"
                                >
                                    <Redo2 size={16} />
                                </button>
                            </div>

                            <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 transition-all" title="Minimize">
                                <Minimize2 size={18} />
                            </button>
                            <button onClick={handleSaveDirectHTML} disabled={isSaving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-[10px] font-black uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                                {isSaving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                            </button>
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 transition-all lg:flex hidden" title={isSidebarOpen ? "Collapse Tools" : "Expand Tools"}>
                                {isSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex min-h-0 relative">
                        <div className="flex-1 relative bg-[#020202] overflow-hidden">
                             <div ref={iframeContainerRef} className="absolute inset-4 rounded-2xl overflow-hidden border border-white/8 shadow-[0_8px_64px_rgba(0,0,0,0.6)] bg-white">
                                {isCodeEditorOpen ? (
                                    <div className="w-full h-full bg-[#0d0d0d] flex flex-col">
                                        {/* Source Editor Header */}
                                        <div className="shrink-0 h-12 bg-zinc-900 flex items-center px-5 justify-between border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-2"><Code2 size={12} /> Source Editor</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {sourceEditorError ? (
                                                    <div className="flex items-center gap-1.5 text-red-400 text-[9px] font-bold uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                                        <AlertCircle size={10} /> {sourceEditorError}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                        <Check size={10} /> Valid HTML
                                                    </div>
                                                )}
                                                <span className="h-4 w-px bg-white/10 mx-1" />
                                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Safe Drafting Mode</span>
                                            </div>
                                        </div>
                                        
                                        {/* Code Editor Area */}
                                        <div className="flex-1 relative">
                                            <textarea 
                                                value={sourceEditorDraft}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSourceEditorDraft(val);
                                                    setSourceEditorError(null);
                                                    // Basic validation
                                                    if (val.length > 0 && (!val.includes('<') || !val.includes('>'))) {
                                                        setSourceEditorError('Missing HTML tags');
                                                    }
                                                }}
                                                spellCheck={false}
                                                className="absolute inset-0 w-full h-full p-6 bg-transparent text-zinc-300 font-mono text-[13px] leading-relaxed outline-none resize-none custom-scrollbar selection:bg-amber-500/30"
                                                placeholder="Edit HTML here. Click 'Apply Changes' to update the preview."
                                            />
                                        </div>
                                        {/* Apply / Discard Controls */}
                                        <div className="shrink-0 h-14 bg-zinc-900/80 border-t border-white/5 flex items-center justify-between px-4 gap-3">
                                            <button
                                                onClick={() => {
                                                    // Validate: must contain <html or <body or at least a tag
                                                    const trimmed = sourceEditorDraft.trim();
                                                    if (!trimmed.includes('<') || !trimmed.includes('>')) {
                                                        setSourceEditorError('Invalid HTML — must contain HTML tags');
                                                        return;
                                                    }
                                                    if (trimmed.length < 50) {
                                                        setSourceEditorError('HTML too short — looks incomplete');
                                                        return;
                                                    }
                                                    setPreviewHtml(trimmed);
                                                    scanSections(trimmed);
                                                    pushToHistory(trimmed);
                                                    setRevisionKey(r => r + 1);
                                                    setIsCodeEditorOpen(false);
                                                    setSourceEditorError(null);
                                                    showToast('Source applied to preview!', 'success');
                                                }}
                                                className="flex-1 h-9 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                            >
                                                ✓ Apply Changes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSourceEditorDraft(previewHtml);
                                                    setSourceEditorError(null);
                                                    setIsCodeEditorOpen(false);
                                                }}
                                                className="h-9 px-5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                            >
                                                Discard
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <iframe 
                                        key={revisionKey} 
                                        ref={iframeRef} 
                                        srcDoc={getHtmlWithTrackerScript(previewHtml)} 
                                        className="w-full h-full border-none" 
                                    />
                                )}
                                
                                <AnimatePresence>
                                    {isRefining && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 z-[400] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
                                        >
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                                                <Bot size={24} className="absolute inset-0 m-auto text-amber-500 animate-pulse" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">AI Surgical Editing</h3>
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">Analyzing DOM & Rewriting Section...</p>
                                            </div>
                                        </motion.div>
                                    )}

                                </AnimatePresence>
                            </div>
                        </div>

                        <AnimatePresence>
                            {isSidebarOpen && (
                                <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} className="w-[340px] shrink-0 bg-zinc-950 border-l border-white/5 flex flex-col">
                                    <div className="h-14 flex items-center justify-between px-5 border-b border-white/5 bg-zinc-900/40">
                                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Editing Center</span>
                                        <button onClick={() => setIsSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center text-white/30 hover:text-white transition-all"><X size={14} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                        {/* TYPE MODE BANNER — shown in sidebar when direct edit is active */}
                                        {isDirectEditEnabled && (
                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
                                                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-wide">Direct Edit Mode</p>
                                                    <p className="text-[10px] text-white/50 mt-1 leading-relaxed">Click on any text inside the preview to edit it directly. Click <span className="text-amber-400 font-bold">Visual</span> when done to save your changes.</p>
                                                </div>
                                                <button
                                                    onClick={() => handleSetDirectEdit(false)}
                                                    className="w-full h-8 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    Done Editing → Back to Visual
                                                </button>
                                            </div>
                                        )}
                                        {activePanel === 'tools' && !isDirectEditEnabled && (
                                            <div className="space-y-6">
                                                <div onClick={() => setActivePanel('images')} className="group bg-[#111111] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-all flex items-center gap-3">
                                                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><ImageIcon size={18} /></div>
                                                    <div><h3 className="text-sm font-semibold text-white">Asset Manager</h3><p className="text-[10px] text-white/40">Replace images</p></div>
                                                    <ChevronRight size={16} className="ml-auto text-white/20" />
                                                </div>
                                                <div onClick={() => setActivePanel('sections')} className="group bg-[#111111] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-blue-500/30 transition-all flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Layers size={18} /></div>
                                                    <div><h3 className="text-sm font-semibold text-white">Sections</h3><p className="text-[10px] text-white/40">Layout overview</p></div>
                                                    <ChevronRight size={16} className="ml-auto text-white/20" />
                                                </div>
                                                
                                                <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Bot size={14} className="text-amber-500" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Intelligence</span>
                                                            <span className="text-[9px] font-bold text-white/60">{modelId.toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowDebug(!showDebug)} className="text-[9px] font-black text-amber-500/60 hover:text-amber-500 uppercase">{showDebug ? 'Hide Debug' : 'Debug'}</button>
                                                </div>
                                                 {showDebug && lastDebugInfo && (
                                                     <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Bot size={14} className="text-amber-500" />
                                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Intelligence Debug</span>
                                                            </div>
                                                            <button onClick={() => setShowDebug(false)} className="text-[9px] font-black text-amber-500 hover:text-amber-400 uppercase">Hide</button>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div>
                                                                <div className="text-[8px] font-black text-white/20 uppercase mb-1">Last Prompt</div>
                                                                <div className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">{lastDebugInfo.prompt}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[8px] font-black text-white/20 uppercase mb-1">Last AI Response</div>
                                                                <div className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">{lastDebugInfo.response}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                         {activePanel === 'images' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button 
                                                        onClick={() => setActivePanel('tools')} 
                                                        className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase flex items-center gap-1.5 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <ChevronLeft size={14} /> Back
                                                    </button>
                                                    <div className="h-px flex-1 bg-white/5" />
                                                </div>
                                                
                                                {/* Tab switcher */}
                                                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                                                    <button 
                                                        onClick={() => setImageTab('unsplash')}
                                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${imageTab === 'unsplash' ? 'bg-amber-500 text-black' : 'text-white/40 hover:text-white'}`}
                                                    >🌐 Unsplash</button>
                                                    <button 
                                                        onClick={() => setImageTab('brand')}
                                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${imageTab === 'brand' ? 'bg-amber-500 text-black' : 'text-white/40 hover:text-white'}`}
                                                    >🏷️ Brand Assets</button>
                                                </div>

                                                {imageTab === 'unsplash' && (
                                                    <div className="space-y-4">
                                                        {/* Detected assets list - always visible or at least accessible */}
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1 flex items-center justify-between">
                                                                <span>1. Select Site Asset</span>
                                                                {activeImageId && (
                                                                    <button onClick={() => { setActiveImageId(null); setUnsplashResults([]); }} className="text-amber-500/60 hover:text-amber-500 text-[8px] font-black uppercase">Deselect</button>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                                                {detectedImages.map(img => (
                                                                    <div 
                                                                        key={img.id} 
                                                                         onClick={() => {
                                                                            setActiveImageId(img.id);
                                                                            const q = lead?.category || lead?.brandDna?.businessName || 'modern business';
                                                                            setUnsplashSearch(q);
                                                                            searchUnsplash(q);
                                                                            iframeRef.current?.contentWindow?.postMessage({ type: 'SCROLL_TO', id: img.id }, '*');
                                                                        }}
                                                                        className={`p-1.5 bg-white/5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${activeImageId === img.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 hover:border-white/20'}`}
                                                                    >
                                                                        <img src={img.src} className="w-8 h-8 rounded-md object-cover shrink-0" />
                                                                        <div className="flex-1 overflow-hidden">
                                                                            <div className="text-[9px] font-bold text-white truncate">{img.id}</div>
                                                                            <div className="text-[8px] text-white/30 truncate">{img.type === 'bg' ? 'Background' : 'Image'}</div>
                                                                        </div>
                                                                        {activeImageId === img.id && <Check size={10} className="text-amber-500" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Search bar */}
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">2. Search Replacement</div>
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 focus-within:border-amber-500/30 transition-all">
                                                                <Search size={14} className="text-white/30 shrink-0" />
                                                                <input 
                                                                    placeholder="Search Unsplash..." 
                                                                    value={unsplashSearch}
                                                                    onChange={(e) => setUnsplashSearch(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && searchUnsplash(unsplashSearch)}
                                                                    className="bg-transparent text-xs text-white outline-none w-full"
                                                                />
                                                                {isSearchingUnsplash && <Loader2 size={12} className="animate-spin text-amber-500 shrink-0" />}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Results grid */}
                                                        {unsplashResults.length > 0 && (
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="text-[9px] font-black text-white/30 uppercase">Results — click to replace</div>
                                                                    <button onClick={() => { setUnsplashResults([]); setActiveImageId(null); }} className="text-[9px] text-white/20 hover:text-white uppercase">Clear</button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                                                    {unsplashResults.map(res => (
                                                                        <div key={res.id} onClick={() => handleReplaceImage(res.urls.regular)} className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative border border-white/5 hover:border-amber-500/50 transition-all">
                                                                            <img src={res.urls.small} className="w-full h-full object-cover" />
                                                                            <div className="absolute inset-0 bg-amber-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                                                <Check size={20} className="text-black" />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {imageTab === 'brand' && (
                                                    <div className="space-y-6">
                                                        {/* 1. BRAND DNA UPLOADS */}
                                                        <div className="space-y-4">
                                                            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Brand Blueprint Uploads</div>
                                                            
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {/* Logo Upload Box */}
                                                                <div className="relative group bg-white/5 border border-white/5 hover:border-amber-500/30 rounded-xl p-3 transition-all">
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Sparkles size={16} /></div>
                                                                        <span className="text-[10px] font-bold text-white/60">Upload Logo</span>
                                                                    </div>
                                                                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                                </div>

                                                                {/* Media Upload Box */}
                                                                <div className="relative group bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-xl p-3 transition-all">
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><ImageIcon size={16} /></div>
                                                                        <span className="text-[10px] font-bold text-white/60">Upload Media</span>
                                                                    </div>
                                                                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'media')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                                </div>
                                                            </div>

                                                            {/* Brand Assets Display */}
                                                            {lead?.brandDna && (
                                                                <div className="space-y-3 pt-2">
                                                                    {lead.brandDna.logoPath && (
                                                                        <div onClick={() => activeImageId && handleReplaceImage(lead.brandDna.logoPath!)} className={`group relative p-2 bg-black/40 border rounded-lg transition-all ${activeImageId ? 'cursor-pointer border-white/10 hover:border-amber-500' : 'opacity-50 grayscale'}`}>
                                                                            <img src={lead.brandDna.logoPath} className="h-10 w-full object-contain bg-white rounded-sm" />
                                                                            <div className="absolute top-1 right-1 px-1 bg-amber-500 text-black text-[7px] font-black uppercase rounded">Logo</div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {(() => {
                                                                        let mediaFiles = [];
                                                                        try {
                                                                            if (lead.brandDna.mediaFiles) {
                                                                                mediaFiles = typeof lead.brandDna.mediaFiles === 'string' 
                                                                                    ? JSON.parse(lead.brandDna.mediaFiles) 
                                                                                    : lead.brandDna.mediaFiles;
                                                                            }
                                                                        } catch (e) { console.error(e); }
                                                                        
                                                                        if (mediaFiles && Array.isArray(mediaFiles) && mediaFiles.length > 0) {
                                                                            return (
                                                                                <div className="grid grid-cols-4 gap-1.5">
                                                                                    {mediaFiles.map((url: string, i: number) => (
                                                                                        <div key={i} onClick={() => activeImageId && handleReplaceImage(url)} className={`aspect-square rounded-md overflow-hidden border transition-all ${activeImageId ? 'cursor-pointer border-white/10 hover:border-amber-500' : 'opacity-40 grayscale'}`}>
                                                                                            <img src={url} className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 2. ACTIVE PAGE ASSETS */}
                                                        <div className="space-y-3 border-t border-white/5 pt-4">
                                                            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Detected on Page ({detectedImages.length})</div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {detectedImages.map((img) => (
                                                                    <div 
                                                                        key={img.id} 
                                                                        onClick={() => setActiveImageId(img.id)}
                                                                        className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${activeImageId === img.id ? 'bg-amber-500/10 border-amber-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                                                    >
                                                                        {img.type === 'text-logo' ? (
                                                                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-amber-500 uppercase">Logo</div>
                                                                        ) : (
                                                                            <img src={img.src} className="w-10 h-10 rounded-lg object-cover" />
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-[9px] font-black text-white/30 uppercase tracking-tighter mb-0.5">{img.type.toUpperCase()}</div>
                                                                            <div className="text-[10px] font-bold text-white/70 truncate">{img.type === 'text-logo' ? img.content : img.id}</div>
                                                                        </div>
                                                                        {activeImageId === img.id && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                            </div>
                                        )}

                                        {activePanel === 'sections' && (
                                            <div className="h-full flex flex-col -m-5">
                                                {/* Pinned Header */}
                                                <div className="p-5 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => setActivePanel('tools')} 
                                                            className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase flex items-center gap-1.5 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <ChevronLeft size={14} /> Back
                                                        </button>
                                                        <div className="h-px flex-1 bg-white/5" />
                                                        <button onClick={handleSectionResetOrder} className="text-[10px] font-black text-white/40 uppercase flex items-center gap-1 hover:text-white transition-all"><RefreshCw size={10} /> Reset</button>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2"><Layers size={14} className="text-blue-500" /><span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Page Structure</span></div>
                                                        <span className="text-[8px] font-bold bg-white/10 px-2 py-0.5 rounded text-white/40 uppercase tracking-tighter">{forgeSections.length} Sections</span>
                                                    </div>
                                                </div>

                                                {/* Scrollable Section List */}
                                                <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-1">
                                                    {forgeSections.map((sec, idx) => (
                                                        <React.Fragment key={sec.id}>
                                                            {/* Drop zone for reordering before each section */}
                                                            <div className="flex justify-center -my-2 relative z-10 opacity-0 hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={() => { setInsertSectionIdx(idx); setActivePanel('add-section'); }}
                                                                    className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all border-2 border-zinc-950"
                                                                >
                                                                    <div className="text-xs">+</div>
                                                                </button>
                                                            </div>
                                                            <div 
                                                                draggable={sec.swappable}
                                                                onDragStart={(e) => handleSectionDragStart(e, idx)}
                                                                onDragOver={(e) => handleSectionDragOver(e, idx)}
                                                                onDrop={(e) => handleSectionDrop(e, idx)}
                                                                className={`bg-[#111111] border ${sec.swappable ? 'cursor-grab active:cursor-grabbing border-white/5 hover:border-white/20' : 'border-white/5 opacity-80'} rounded-xl overflow-hidden transition-all shadow-lg ${selectedSection === sec.id ? 'ring-1 ring-amber-500/50 border-amber-500/30' : ''}`}
                                                            >
                                                                <div className="p-3 flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-sm shrink-0" style={{ color: SECTION_COLORS[sec.key] || '#9CA3AF' }}>
                                                                        {SECTION_ICONS[sec.key] || '◈'}
                                                                    </div>
                                                                    <div 
                                                                        className="flex-1 min-w-0 cursor-pointer"
                                                                        onClick={() => {
                                                                            setSelectedSection(sec.id);
                                                                            const iframeDoc = iframeRef.current?.contentDocument;
                                                                            if (iframeDoc) {
                                                                                const el = iframeDoc.getElementById(sec.id);
                                                                                if (el) {
                                                                                    setOriginalSectionHtml(el.outerHTML);
                                                                                    const schema = detectSchema(sec.id);
                                                                                    if (schema) {
                                                                                        const values = extractSchemaValuesWithFallback(el, schema);
                                                                                        setSchemaValues(values);
                                                                                    }
                                                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <div className={`text-xs font-bold truncate ${selectedSection === sec.id ? 'text-amber-500' : 'text-white/80'} ${!sec.visible && 'line-through opacity-50'}`}>
                                                                            {sec.label}
                                                                        </div>
                                                                        <div className="text-[9px] text-white/30 uppercase mt-0.5">{sec.tag}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <button 
                                                                            onClick={() => handleSectionToggle(sec.id)}
                                                                            className={`p-2 rounded-lg transition-all ${sec.visible ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-red-400 bg-red-400/10 hover:bg-red-400/20'}`}
                                                                        >
                                                                            {sec.visible ? <Eye size={14} /> : <Eye size={14} className="opacity-50" />}
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDeleteSection(sec.id)}
                                                                            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex border-t border-white/5 bg-black/20">
                                                                    <button 
                                                                        onClick={() => { setSelectedSection(sec.id); setActivePanel('ai-refine'); }}
                                                                        className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-purple-400 hover:bg-purple-500/10 transition-all border-r border-white/5"
                                                                    >
                                                                        <Wand2 size={10} /> AI
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => { setSelectedSection(sec.id); setActivePanel('styles'); }}
                                                                        className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-amber-500 hover:bg-amber-500/10 transition-all border-r border-white/5"
                                                                    >
                                                                        <PaintBucket size={10} /> Style
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => { setSelectedSection(sec.id); setActivePanel('templates'); }}
                                                                        className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-blue-400 hover:bg-blue-500/10 transition-all"
                                                                    >
                                                                        <LucideLayout size={10} /> Layout
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </React.Fragment>
                                                    ))}
                                                    
                                                    {/* Spacer for bottom pinned button */}
                                                    <div className="h-12" />
                                                </div>

                                                {/* Pinned Footer */}
                                                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10">
                                                    <button 
                                                        onClick={() => { setInsertSectionIdx(forgeSections.length); setActivePanel('add-section'); }}
                                                        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all uppercase text-[10px] font-black tracking-widest group"
                                                    >
                                                        <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                                        <span>Add New Section</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {activePanel === 'add-section' && (
                                            <div className="space-y-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <button 
                                                            onClick={() => setActivePanel('sections')} 
                                                            className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase flex items-center gap-1.5 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <ChevronLeft size={14} /> Back
                                                        </button>
                                                        <div className="h-px flex-1 bg-white/5" />
                                                    </div>
                                                
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-2"><Layers size={14} className="text-blue-500" /><span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Choose Section Type</span></div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.keys(SECTION_TEMPLATES).map(type => {
                                                            if (type === 'navbar' || type === 'footer') return null; // usually you don't add multiple navbars
                                                            return (
                                                                <button
                                                                    key={type}
                                                                    onClick={() => handleAddSection(type, SECTION_TEMPLATES[type][0].html)}
                                                                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-xl flex flex-col items-center gap-2 transition-all group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-sm" style={{ color: SECTION_COLORS[type] || '#9CA3AF' }}>
                                                                        {SECTION_ICONS[type] || '◈'}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-white/70 group-hover:text-white uppercase tracking-tighter">{type}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activePanel === 'ai-refine' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button 
                                                        onClick={() => setActivePanel('sections')} 
                                                        className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase flex items-center gap-1.5 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <ChevronLeft size={14} /> Back
                                                    </button>
                                                    <div className="h-px flex-1 bg-white/5" />
                                                </div>

                                                {selectedSection && (
                                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-center gap-3 mb-6">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500">
                                                            <Wand2 size={14} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{selectedSection.split('-').join(' ')}</div>
                                                            <div className="text-[8px] font-bold text-purple-400/60 uppercase">AI Modification</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedSection ? (
                                                    <div className="space-y-5">
                                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Target</div>
                                                            <div className="text-xs font-bold text-white mb-2">{selectedSection}</div>
                                                            <div className="text-[10px] text-white/40 bg-black/20 p-2 rounded italic line-clamp-2">
                                                                {iframeRef.current?.contentDocument?.getElementById(selectedSection)?.textContent?.trim() || "Empty section"}
                                                            </div>
                                                        </div>
                                                        <textarea placeholder="Describe changes for this section..." value={sectionInstruction} onChange={(e) => setSectionInstruction(e.target.value)} className="w-full h-32 bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500/50 resize-none" />
                                                        <button onClick={handleRefineSection} disabled={isRefining || !sectionInstruction} className="w-full h-10 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2">{isRefining ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}Refine with AI</button>
                                                    </div>
                                                ) : <div className="py-20 text-center opacity-20"><MousePointer2 size={32} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Select a section to use AI</p></div>}
                                            </div>
                                        )}

                                        {activePanel === 'styles' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button 
                                                        onClick={() => setActivePanel('sections')} 
                                                        className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase flex items-center gap-1.5 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <ChevronLeft size={14} /> Back
                                                    </button>
                                                    <div className="h-px flex-1 bg-white/5" />
                                                </div>

                                                {selectedSection && (
                                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 mb-6">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                                                            <PaintBucket size={14} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{selectedSection.split('-').join(' ')}</div>
                                                            <div className="text-[8px] font-bold text-amber-400/60 uppercase">Visual Styles</div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2"><Palette size={14} className="text-amber-500" /><span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Theme Palette</span></div>
                                                    </div>
                                                    <select value={activePalette} onChange={(e) => setActivePalette(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white mb-3 outline-none focus:border-amber-500">
                                                        {Object.keys(COLOR_PALETTES).map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                    <button onClick={applyPaletteToSite} className="w-full py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black rounded-lg text-[10px] font-black uppercase transition-all flex justify-center items-center gap-2"><Sparkles size={12} /> Apply to entire site</button>
                                                </div>

                                                {selectedSection ? (
                                                    <div className="space-y-6">
                                                        {STYLE_GROUPS.map(group => (
                                                            <div key={group.group} className="space-y-3">
                                                                <div className="flex items-center gap-2"><group.icon size={12} className="text-white/30" /><span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{group.label}</span></div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {group.options.map(opt => {
                                                                        const isColor = group.group === 'bg' || group.group === 'text-color';
                                                                        const colorMap: any = {
                                                                            // Neutrals
                                                                            'bg-white': '#FFFFFF', 'bg-zinc-50': '#FAFAFA', 'bg-zinc-900': '#18181B', 'bg-zinc-950': '#09090B', 'bg-black': '#000000', 
                                                                            'bg-slate-50': '#F8FAFC', 'bg-slate-900': '#0F172A',
                                                                            // Blues / Cyans
                                                                            'bg-blue-600': '#2563EB', 'bg-blue-900': '#1E3A8A', 'bg-sky-500': '#0EA5E9', 'bg-cyan-400': '#22D3EE',
                                                                            // Greens
                                                                            'bg-emerald-600': '#059669', 
                                                                            // Yellows / Ambers
                                                                            'bg-amber-400': '#FBBF24', 'bg-yellow-400': '#FACC15', 
                                                                            // Pinks / Purples / Reds
                                                                            'bg-rose-500': '#F43F5E', 'bg-fuchsia-600': '#C026D3', 'bg-purple-900': '#581C87',
                                                                            
                                                                            // Text Specifics
                                                                            'text-white': '#FFFFFF', 'text-black': '#000000', 'text-zinc-900': '#18181B', 'text-zinc-500': '#71717A',
                                                                            'text-blue-600': '#2563EB', 'text-blue-900': '#1E3A8A', 'text-amber-400': '#FBBF24', 'text-rose-500': '#F43F5E',
                                                                            'text-cyan-400': '#22D3EE', 'text-fuchsia-400': '#E879F9', 'text-yellow-400': '#FACC15',
                                                                            'text-slate-900': '#0F172A', 'text-slate-600': '#475569'
                                                                        };
                                                                        
                                                                        const getColorHex = (cClass: string) => {
                                                                            if (cClass.includes('[#')) {
                                                                                const hexMatch = cClass.match(/\[(#[0-9A-Fa-f]{3,6})\]/);
                                                                                return hexMatch ? hexMatch[1] : '#ccc';
                                                                            }
                                                                            return colorMap[cClass] || '#ccc';
                                                                        };

                                                                        return (
                                                                            <button 
                                                                                key={opt} 
                                                                                onClick={() => applyTailwindStyle(selectedSection, group.group, opt)} 
                                                                                className={`relative group transition-all hover:scale-110 active:scale-95 ${appliedStyles[group.group] === opt ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950 scale-110 z-10' : ''}`}
                                                                                title={opt}
                                                                            >
                                                                                {isColor ? (
                                                                                    <div 
                                                                                        className="w-9 h-9 rounded-full border border-white/10 shadow-lg" 
                                                                                        style={{ 
                                                                                            backgroundColor: getColorHex(opt),
                                                                                            boxShadow: opt === 'bg-white' || opt === 'text-white' || opt === 'bg-[#FAF9F6]' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none'
                                                                                        }} 
                                                                                    />
                                                                                ) : (
                                                                                    <div className={`px-2 py-1.5 rounded-lg text-[9px] font-bold border ${appliedStyles[group.group] === opt ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20'}`}>
                                                                                        {opt.replace(/^(py-|rounded-)/, '')}
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <div className="py-20 text-center opacity-20"><Palette size={32} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Select a section to style</p></div>}
                                            </div>
                                        )}

                                        {activePanel === 'templates' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button 
                                                        onClick={() => setActivePanel('sections')} 
                                                        className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50 uppercase flex items-center gap-1.5 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <ChevronLeft size={14} /> Back
                                                    </button>
                                                    <div className="h-px flex-1 bg-white/5" />
                                                </div>

                                                {selectedSection && (
                                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3 mb-6">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                                                            <LucideLayout size={14} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black text-white uppercase tracking-widest">{selectedSection.split('-').join(' ')}</div>
                                                            <div className="text-[8px] font-bold text-blue-400/60 uppercase">Layout Editor</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedSection ? (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2"><LucideLayout size={14} className="text-amber-500" /><span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Layout Variants</span></div>
                                                            <span className="text-[8px] font-bold bg-white/10 px-2 py-0.5 rounded text-white/40 uppercase tracking-tighter">5 Options</span>
                                                        </div>

                                                        {(() => {
                                                            const schema = detectSchema(selectedSection);
                                                            if (!schema) return <div className="text-[10px] text-white/40 bg-white/5 p-4 rounded-xl italic">No layout variants detected for this component type.</div>;
                                                            
                                                            const matchedType = Object.keys(SECTION_SCHEMAS).find(k => SECTION_SCHEMAS[k] === schema);
                                                            if (!matchedType || !SECTION_TEMPLATES[matchedType]) return <div className="text-[10px] text-white/40">No templates available.</div>;
                                                            
                                                            return (
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {SECTION_TEMPLATES[matchedType].map((tpl, i) => (
                                                                        <div 
                                                                            key={i} 
                                                                            onClick={() => handleApplyTemplate(tpl.html)}
                                                                            className="group cursor-pointer space-y-2"
                                                                        >
                                                                            <div className="aspect-[4/3] bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center text-white/50 group-hover:bg-amber-500/10 group-hover:border-amber-500/60 group-hover:text-amber-400 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all duration-300 overflow-hidden relative">
                                                                                <div className="w-full h-full transform group-hover:scale-105 transition-transform duration-500 drop-shadow-xl">
                                                                                    <LayoutIcon type={matchedType} i={i} />
                                                                                </div>
                                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                                                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest w-full text-center">Select Layout</div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <div className="text-[9px] font-black text-white/40 uppercase group-hover:text-amber-400 transition-colors">{tpl.label}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                                            <div className="flex gap-2 text-amber-500 mb-2"><Sparkles size={12} /> <span className="text-[9px] font-black uppercase tracking-widest">Smart Preservation</span></div>
                                                            <p className="text-[9px] text-white/40 leading-relaxed">Switching layouts will attempt to keep your current text and branding while re-organizing the visual structure.</p>
                                                        </div>
                                                    </div>
                                                ) : <div className="py-20 text-center opacity-20"><LucideLayout size={32} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Select a section to change layout</p></div>}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {toast && (
                                <motion.div key="toast" initial={{ opacity: 0, y: 16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 16, x: '-50%' }} className="absolute bottom-6 left-1/2 z-[300] bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 whitespace-nowrap">
                                    <CheckCircle2 size={14} className={toast.type === 'success' ? 'text-green-400' : 'text-sky-400'} />
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white">{toast.msg}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

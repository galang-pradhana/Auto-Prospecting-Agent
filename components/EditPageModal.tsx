'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Save, Sparkles, Wand2, Palette, Edit3, 
    Loader2, Bot, Type, Layers, Eye, Code2, Copy, 
    ExternalLink, AlertCircle, RotateCcw, CheckCircle2,
    ChevronDown, Image as ImageIcon, Search, RefreshCw, 
    ImagePlus, ChevronRight, Check
} from 'lucide-react';
import { updateLeadHtml } from '@/lib/actions/lead';
import { getStyleModels } from '@/lib/actions/ai';
import { getUserSettings } from '@/lib/actions/user-settings';

interface EditPageModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
}

export default function EditPageModal({ isOpen, onClose, lead }: EditPageModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [styles, setStyles] = useState<any[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [modelId, setModelId] = useState('gemini-3-1-pro');
    const [magicPrompt, setMagicPrompt] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState(0);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);
    const [isDirectEditEnabled, setIsDirectEditEnabled] = useState(false);
    
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
    
    // --- Image Editor State ---
    const [detectedImages, setDetectedImages] = useState<{ 
        src: string, 
        id: string, 
        type: 'img' | 'bg', 
        resolution?: string,
        assetId?: string,
        sourceType?: 'img-tag' | 'inline-style' | 'tailwind-class' | 'css-rule',
        cssSelector?: string  // for css-rule sourceType
    }[]>([]);
    const [activeImageId, setActiveImageId] = useState<string | null>(null);
    const [unsplashSearch, setUnsplashSearch] = useState('');
    const [unsplashResults, setUnsplashResults] = useState<{ id: string, urls: { regular: string, small: string }, alt_description: string, width: number, height: number }[]>([]);
    const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);
    const [activePanel, setActivePanel] = useState<'tools' | 'images'>('tools');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const s = await getStyleModels();
                if (s) setStyles(s);
            } catch (e) {
                console.error(e);
            }
        }
        if (isOpen) {
            load();
            const fetchSettings = async () => {
                const settings = await getUserSettings();
                if (settings?.htmlModel) {
                    setModelId(settings.htmlModel);
                }
            };
            fetchSettings();
            setIsDirectEditEnabled(false);
            setMagicPrompt('');
            const initialHtml = getInitialHtml();
            setPreviewHtml(initialHtml);
            setRevisionKey(r => r + 1);
            setActivePanel('tools');
            setIsSidebarOpen(window.innerWidth >= 1024);
            // Detect images after a short delay to ensure previewHtml is set
            setTimeout(() => {
                scanImages(initialHtml);
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!activeJobId) return;

        const pollJob = async () => {
            try {
                const res = await fetch(`/api/jobs/status?id=${activeJobId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.job) {
                        setJobProgress(data.job.progress);

                        if (data.job.status === 'COMPLETED') {
                            showToast("Preview ready — hit Save HTML to apply.");
                            setPreviewHtml(data.job.data?.htmlCode || '');
                            setRevisionKey(r => r + 1);
                            setTimeout(() => scanImages(data.job.data?.htmlCode || ''), 100);
                            setIsRegenerating(false);
                            setActiveJobId(null);
                        } else if (data.job.status === 'FAILED') {
                            alert("AI Regeneration failed: " + data.job.message);
                            setIsRegenerating(false);
                            setActiveJobId(null);
                        }
                    }
                }
            } catch (e) {
                // Ignore sync errors
            }
        };

        const interval = setInterval(pollJob, 2000);
        return () => clearInterval(interval);
    }, [activeJobId]);

    const scanImages = async (html: string) => {
        if (!html) return;
        setIsScanning(true);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const imgs: typeof detectedImages = [];
        const seenSrcs = new Set<string>(); // deduplicate same URL from multiple layers

        // Helper to get dimensions with 2s timeout
        const getDimensions = (src: string): Promise<string> => new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(""), 2000);
            const img = new Image();
            img.onload = () => { clearTimeout(timeout); resolve(`${img.naturalWidth}x${img.naturalHeight}`); };
            img.onerror = () => { clearTimeout(timeout); resolve(""); };
            img.src = src;
        });

        try {
            // LAYER 1: <img> tags
            const imgElements = Array.from(doc.querySelectorAll('img'));
            for (let idx = 0; idx < imgElements.length; idx++) {
                const img = imgElements[idx];
                const src = img.getAttribute('src');
                const assetId = img.getAttribute('data-asset-id');
                if (src && !src.startsWith('data:') && !seenSrcs.has(src)) {
                    seenSrcs.add(src);
                    const res = await getDimensions(src);
                    imgs.push({ 
                        src, 
                        id: assetId ? `asset-${assetId}` : `img-${idx}`, 
                        type: 'img',
                        sourceType: 'img-tag',
                        resolution: res,
                        assetId: assetId || undefined 
                    });
                }
            }

            // LAYER 2: Inline style background-image
            const bgElements = Array.from(doc.querySelectorAll('[style*="background-image"]'));
            for (let idx = 0; idx < bgElements.length; idx++) {
                const el = bgElements[idx];
                const style = el.getAttribute('style');
                const assetId = el.getAttribute('data-asset-id');
                const match = style?.match(/url\(["']?([^"'\)]+)["']?\)/);
                if (match && match[1] && !seenSrcs.has(match[1])) {
                    seenSrcs.add(match[1]);
                    const res = await getDimensions(match[1]);
                    imgs.push({ 
                        src: match[1], 
                        id: assetId ? `asset-${assetId}` : `bg-${idx}`, 
                        type: 'bg',
                        sourceType: 'inline-style',
                        resolution: res,
                        assetId: assetId || undefined 
                    });
                }
            }

            // LAYER 3: Tailwind class background-url pattern
            // e.g. class="bg-cover" with url encoded inside square bracket notation
            const allElements = Array.from(doc.querySelectorAll('[class]'));
            const tailwindBgEls = allElements.filter(el => /bg-\[url/.test(el.getAttribute('class') || ''));
            for (let idx = 0; idx < tailwindBgEls.length; idx++) {
                const el = tailwindBgEls[idx];
                const className = el.getAttribute('class') || '';
                // Match both single and double quoted URLs in Tailwind class
                const match = className.match(/bg-\[url\(['"]?([^'"\)\]]+)['"]?\)\]/);
                if (match && match[1] && !match[1].startsWith('data:') && !seenSrcs.has(match[1])) {
                    seenSrcs.add(match[1]);
                    const assetId = el.getAttribute('data-asset-id');
                    const res = await getDimensions(match[1]);
                    imgs.push({ 
                        src: match[1], 
                        id: assetId ? `asset-${assetId}` : `twbg-${idx}`, 
                        type: 'bg',
                        sourceType: 'tailwind-class',
                        resolution: res,
                        assetId: assetId || undefined 
                    });
                }
            }

            // LAYER 4: CSS <style> tag background-image rules
            const styleEls = Array.from(doc.querySelectorAll('style'));
            let cssImgIdx = 0;
            for (const styleEl of styleEls) {
                const cssText = styleEl.textContent || '';
                // Match: selector { ... background(-image)?: url('...') ... }
                const ruleRegex = /([^{}]+)\{[^{}]*background(?:-image)?\s*:[^;}]*url\(['"]?([^'"\)\s]+)['"]?\)[^{}]*\}/g;
                let ruleMatch;
                while ((ruleMatch = ruleRegex.exec(cssText)) !== null) {
                    const selector = ruleMatch[1].trim().split(',')[0].trim(); // take first selector only
                    const url = ruleMatch[2];
                    if (url && !url.startsWith('data:') && !seenSrcs.has(url)) {
                        try {
                            const target = doc.querySelector(selector);
                            if (target) {
                                seenSrcs.add(url);
                                const assetId = target.getAttribute('data-asset-id');
                                const res = await getDimensions(url);
                                imgs.push({
                                    src: url,
                                    id: assetId ? `asset-${assetId}` : `cssrule-${cssImgIdx}`,
                                    type: 'bg',
                                    sourceType: 'css-rule',
                                    resolution: res,
                                    assetId: assetId || undefined,
                                    cssSelector: selector
                                });
                                cssImgIdx++;
                            }
                        } catch (_) { /* invalid selector, skip */ }
                    }
                }
            }

            setDetectedImages(imgs);
        } catch (e) {
            console.error("Scan error:", e);
        } finally {
            setIsScanning(false);
        }
    };

    const handleSearchUnsplash = async () => {
        if (!unsplashSearch) return;
        setIsSearchingUnsplash(true);
        try {
            const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
            const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashSearch)}&per_page=12&client_id=${accessKey}`);
            const data = await res.json();
            setUnsplashResults(data.results || []);
        } catch (e) {
            console.error("Unsplash error:", e);
            showToast("Failed to search Unsplash", 'info');
        } finally {
            setIsSearchingUnsplash(false);
        }
    };

    const handleReplaceImage = (newSrc: string) => {
        if (!activeImageId) return;
        
        const imgObj = detectedImages.find(i => i.id === activeImageId);
        if (!imgObj) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(previewHtml, 'text/html');
        let success = false;

        // Helper: Replace inline style background-image on an element
        const replaceInlineStyle = (el: Element) => {
            let style = el.getAttribute('style') || '';
            if (style.includes('background')) {
                el.setAttribute('style', style.replace(/url\(["']?([^"'\)]+)["']?\)/, `url('${newSrc}')`) );
                return true;
            }
            return false;
        };

        // Helper: Replace Tailwind background-url class on an element
        const replaceTailwindClass = (el: Element) => {
            const cls = el.getAttribute('class') || '';
            if (/bg-\[url/.test(cls)) {
                // Break the string to prevent Tailwind JIT from scanning it as a real class
                const bgPrefix = 'bg-[';
                const newCls = cls.replace(/bg-\[url\(['"]?[^'"\)\]]+['"]?\)\]/, `${bgPrefix}url('${newSrc}')]`);
                el.setAttribute('class', newCls);
                return true;
            }
            return false;
        };

        // STRATEGY 1: By data-asset-id (most precise)
        if (imgObj.assetId) {
            const target = doc.querySelector(`[data-asset-id="${imgObj.assetId}"]`);
            if (target) {
                if (imgObj.sourceType === 'img-tag' || imgObj.type === 'img') {
                    target.setAttribute('src', newSrc);
                    target.removeAttribute('srcset');
                    target.removeAttribute('data-srcset');
                    target.removeAttribute('data-src');
                    success = true;
                } else if (imgObj.sourceType === 'tailwind-class') {
                    success = replaceTailwindClass(target);
                } else {
                    // inline-style or css-rule fallback
                    success = replaceInlineStyle(target) || replaceTailwindClass(target);
                }
            }
        }

        // STRATEGY 2: By source type + index
        if (!success) {
            const idParts = imgObj.id.split('-');
            const prefix = idParts[0];
            const idx = parseInt(idParts[idParts.length - 1]);

            if (prefix === 'img' || imgObj.sourceType === 'img-tag') {
                const target = doc.querySelectorAll('img')[idx];
                if (target) {
                    target.setAttribute('src', newSrc);
                    target.removeAttribute('srcset');
                    target.removeAttribute('data-srcset');
                    target.removeAttribute('data-src');
                    success = true;
                }

            } else if (prefix === 'twbg' || imgObj.sourceType === 'tailwind-class') {
                // Tailwind background-url class pattern
                const allEls = Array.from(doc.querySelectorAll('[class]')).filter(el =>
                    /bg-\[url/.test(el.getAttribute('class') || '')
                );
                // Search by matching old src in class, or by index
                const target = allEls.find(el => (el.getAttribute('class') || '').includes(encodeURIComponent(imgObj.src).slice(0, 30)) || (el.getAttribute('class') || '').includes(imgObj.src.slice(0, 30)))
                    || allEls[idx];
                if (target) success = replaceTailwindClass(target);

            } else if (prefix === 'cssrule' || imgObj.sourceType === 'css-rule') {
                // CSS <style> tag rule replacement
                const styleEls = Array.from(doc.querySelectorAll('style'));
                for (const styleEl of styleEls) {
                    const original = styleEl.textContent || '';
                    if (original.includes(imgObj.src)) {
                        styleEl.textContent = original.replace(
                            new RegExp(`url\\(['"]?${imgObj.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\)`, 'g'),
                            `url('${newSrc}')`
                        );
                        success = true;
                        break;
                    }
                }

            } else if (prefix === 'bg' || imgObj.sourceType === 'inline-style') {
                const target = doc.querySelectorAll('[style*="background-image"]')[idx];
                if (target) success = replaceInlineStyle(target);
            }
        }

        if (success) {
            const doctypeStr = doc.doctype
                ? `<!DOCTYPE ${doc.doctype.name}${doc.doctype.publicId ? ` PUBLIC "${doc.doctype.publicId}"` : ''}${!doc.doctype.publicId && doc.doctype.systemId ? ' SYSTEM' : ''}${doc.doctype.systemId ? ` "${doc.doctype.systemId}"` : ''}>`
                : '<!DOCTYPE html>';
            const newHtml = doctypeStr + '\n' + doc.documentElement.outerHTML;
            setPreviewHtml(newHtml);
            setRevisionKey(r => r + 1);
            setTimeout(() => scanImages(newHtml), 300);
            setActiveImageId(null);
            showToast('Image replaced successfully!');
        } else {
            showToast('Failed to locate target image on page', 'info');
        }
    };

    const handleHighlightImage = (id: string | null) => {
        if (!iframeRef.current?.contentDocument) return;
        const doc = iframeRef.current.contentDocument;
        
        // Remove all previous highlights
        doc.querySelectorAll('.forge-img-highlight').forEach((el: any) => {
            el.style.outline = "";
            el.classList.remove('forge-img-highlight');
        });

        if (!id) return;

        const imgObj = detectedImages.find(i => i.id === id);
        if (!imgObj) return;

        let target: Element | null = null;

        // Priority 1: Try data-asset-id selector (for generated pages)
        if (imgObj.assetId) {
            target = doc.querySelector(`[data-asset-id="${imgObj.assetId}"]`);
        }

        // Priority 2: Fallback to index-based selector (for old/manual pages)
        if (!target) {
            const idParts = imgObj.id.split('-');
            const idx = parseInt(idParts[idParts.length - 1]);
            if (!isNaN(idx)) {
                if (imgObj.type === 'img') {
                    target = doc.querySelectorAll('img')[idx] || null;
                } else {
                    target = doc.querySelectorAll('[style*="background-image"]')[idx] || null;
                }
            }
        }

        if (target) {
            (target as any).style.outline = "4px solid #EAB308";
            (target as any).classList.add('forge-img-highlight');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const isModified = previewHtml !== getInitialHtml();

    const handleRevert = () => {
        if (window.confirm("Discards all preview changes. Are you sure?")) {
            const initialHtml = getInitialHtml();
            setPreviewHtml(initialHtml);
            setRevisionKey(r => r + 1);
            showToast("Reverted to original", 'info');
            setTimeout(() => scanImages(initialHtml), 100);
        }
    };

    const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleEnableDirectEdit = () => {
        if (!iframeRef.current || !iframeRef.current.contentDocument) return;
        try {
            const doc = iframeRef.current.contentDocument;
            const newState = !isDirectEditEnabled;
            if (newState) {
                const textElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, li');
                textElements.forEach((el: any) => {
                    el.contentEditable = "true";
                    el.style.outline = "1px dashed rgba(250,204,21,0.4)";
                    el.style.cursor = "text";
                });
                showToast("Direct Edit Active — click any text to edit", 'info');
            } else {
                const textElements = doc.querySelectorAll('[contenteditable="true"]');
                textElements.forEach((el: any) => {
                    el.contentEditable = "false";
                    el.style.outline = "none";
                    el.style.cursor = "default";
                });
            }
            setIsDirectEditEnabled(newState);
        } catch (e) {
            console.error("Could not enable direct edit:", e);
            showToast("Cross-origin error. Cannot access iframe content.", 'info');
        }
    };

    const handleSaveDirectHTML = async () => {
        if (!iframeRef.current || !iframeRef.current.contentDocument) return;
        setIsSaving(true);
        try {
            const doc = iframeRef.current.contentDocument;
            const textElements = doc.querySelectorAll('[contenteditable="true"]');
            textElements.forEach((el: any) => {
                el.removeAttribute('contenteditable');
                el.style.outline = "none";
                el.style.cursor = "";
            });
            setIsDirectEditEnabled(false);
            
            // SAFE SERIALIZATION: Preserve Doctype and use HTML5 compliant outerHTML
            const doctypeStr = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}${doc.doctype.publicId ? ` PUBLIC "${doc.doctype.publicId}"` : ''}${!doc.doctype.publicId && doc.doctype.systemId ? ' SYSTEM' : ''}${doc.doctype.systemId ? ` "${doc.doctype.systemId}"` : ''}>` : '<!DOCTYPE html>';
            const newHtml = doctypeStr + '\n' + doc.documentElement.outerHTML;

            const res = await updateLeadHtml(lead.id, newHtml, lead.viewVersion || 'dummy');
            if (res.success) {
                showToast("Changes saved successfully!");
                setPreviewHtml(newHtml);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                alert("Save failed");
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAIRegenerate = async () => {
        if (isRegenerating) return;
        setIsRegenerating(true);
        setJobProgress(0);
        try {
            const res = await fetch('/api/edit/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    leadId: lead.id, 
                    styleId: selectedStyle, 
                    instructions: magicPrompt, 
                    previewOnly: true,
                    modelId
                })
            });
            const data = await res.json();
            if (data.success && data.jobId) {
                setActiveJobId(data.jobId);
            } else {
                alert("Failed to start AI generation: " + data.message);
                setIsRegenerating(false);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
            setIsRegenerating(false);
        }
    };

    const handlePreviewLive = () => {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(previewHtml);
            win.document.close();
        } else {
            alert("Pop-up blocked! Please allow pop-ups for this site.");
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(previewHtml);
        showToast("Code copied to clipboard!");
    };

    if (!isOpen || !lead) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center">
                {/* backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
                />

                {/* Main Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 16 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    className="relative w-full max-w-[1600px] h-[98vh] md:h-[96vh] mx-auto md:mx-4 bg-zinc-950 border border-white/8 rounded-none md:rounded-[28px] overflow-hidden flex flex-col lg:flex-row shadow-2xl"
                >
                    {/* ── LEFT: iframe canvas ── */}
                    <div className="flex-1 flex flex-col border-r border-white/5 min-w-0">

                        {/* Top bar */}
                        <div className="h-14 shrink-0 bg-zinc-900/60 border-b border-white/5 flex items-center px-2 md:px-5 w-full overflow-hidden">
                            {/* Scrollable Left Side */}
                            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide flex-1 pr-4 min-w-0">
                                {/* Lead name badge */}
                                <div className="flex items-center gap-2.5 shrink-0">
                                    <div className="w-7 h-7 shrink-0 rounded-xl bg-accent-gold/15 flex items-center justify-center border border-accent-gold/25">
                                        <Layers size={13} className="text-accent-gold" />
                                    </div>
                                    <span className="text-[11px] font-black text-white uppercase tracking-widest truncate max-w-[80px] md:max-w-[180px]">
                                        {lead.name}
                                    </span>
                                    <span className="hidden sm:inline-block text-[9px] text-white/20 font-black uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded-full">
                                        Live
                                    </span>
                                </div>

                                <div className="h-5 w-px bg-white/8 mx-1 shrink-0" />

                                {/* View Code toggle */}
                                <button
                                    onClick={() => setIsCodeEditorOpen(!isCodeEditorOpen)}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        isCodeEditorOpen
                                        ? 'bg-amber-400/15 text-amber-400 border-amber-400/30'
                                        : 'bg-white/4 text-white/40 hover:text-white border-white/8 hover:bg-white/8'
                                    }`}
                                >
                                    <Code2 size={12} />
                                    <span className="hidden md:inline">{isCodeEditorOpen ? 'Close Code' : 'View Code'}</span>
                                </button>

                                {/* Direct edit toggle */}
                                <button
                                    onClick={handleEnableDirectEdit}
                                    disabled={isCodeEditorOpen}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border disabled:opacity-25 disabled:cursor-not-allowed ${
                                        isDirectEditEnabled
                                        ? 'bg-sky-400/15 text-sky-400 border-sky-400/30'
                                        : 'bg-white/4 text-white/40 hover:text-white border-white/8 hover:bg-white/8'
                                    }`}
                                >
                                    <Type size={12} />
                                    <span className="hidden md:inline">{isDirectEditEnabled ? 'Editing On' : 'Text Editor'}</span>
                                </button>

                                {/* Revert button (conditional) */}
                                <AnimatePresence>
                                    {isModified && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.85 }}
                                            onClick={handleRevert}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                                        >
                                            <RotateCcw size={12} /> Revert
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                                
                                {/* Spacer */}
                                <div className="hidden md:block flex-1" />

                                {/* Save button */}
                                <button
                                    onClick={handleSaveDirectHTML}
                                    disabled={isSaving}
                                    className="shrink-0 flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 bg-accent-gold hover:bg-yellow-300 active:scale-95 text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent-gold/15 disabled:opacity-50 md:ml-auto"
                                >
                                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    <span className="whitespace-nowrap">Save HTML</span>
                                </button>
                            </div>

                            {/* Fixed Right Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 pl-2 md:pl-3 border-l border-white/10">
                                {/* Preview in new tab */}
                                <button
                                    onClick={handlePreviewLive}
                                    className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-white/4 text-white/40 hover:text-white border border-white/8 hover:bg-white/8 transition-all"
                                    title="Preview in new tab"
                                >
                                    <ExternalLink size={14} />
                                </button>

                                {/* Mobile Toggle Tools */}
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="lg:hidden w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white"
                                >
                                    <Edit3 size={14} />
                                </button>

                                <button 
                                    onClick={onClose}
                                    className="lg:hidden w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* iFrame + code editor area */}
                        <div className="flex-1 relative bg-zinc-900/20 overflow-hidden">
                            {/* Subtle dot grid bg */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                            {/* Code editor overlay */}
                            <AnimatePresence>
                                {isCodeEditorOpen && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-50 bg-zinc-950 flex flex-col"
                                    >
                                        <div className="flex items-center justify-between px-6 py-3 bg-zinc-900/80 border-b border-white/5 shrink-0">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                <Code2 size={12} className="text-amber-400" /> Full Source Code
                                            </div>
                                            <button
                                                onClick={handleCopyCode}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-white/50 hover:text-white"
                                            >
                                                <Copy size={11} /> Copy All
                                            </button>
                                        </div>
                                        <textarea
                                            value={previewHtml}
                                            onChange={(e) => setPreviewHtml(e.target.value)}
                                            className="flex-1 w-full bg-zinc-950 text-blue-400/80 p-6 font-mono text-xs leading-relaxed outline-none resize-none custom-scrollbar"
                                            spellCheck={false}
                                        />
                                        <div className="px-6 py-3 bg-amber-500/8 border-t border-amber-500/15 flex items-center gap-2 shrink-0">
                                            <AlertCircle size={11} className="text-amber-500" />
                                            <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest">Warning: Edits here overwrite all visual changes above.</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* iframe */}
                            <div className="absolute inset-4 md:inset-6 rounded-2xl overflow-hidden border border-white/8 shadow-[0_8px_64px_rgba(0,0,0,0.6)] bg-white">
                                {previewHtml ? (
                                    <iframe
                                        key={revisionKey}
                                        ref={iframeRef}
                                        srcDoc={previewHtml}
                                        className="w-full h-full border-none bg-white"
                                        title="Live Editor"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-600">
                                        <Layers size={48} className="opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest opacity-40">No HTML Content Generated Yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT PANEL: Tools ── */}
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div 
                                initial={{ x: 340 }}
                                animate={{ x: 0 }}
                                exit={{ x: 340 }}
                                className="fixed lg:relative inset-y-0 right-0 z-[210] lg:z-auto w-full md:w-[360px] lg:w-[340px] shrink-0 bg-zinc-950 flex flex-col border-l border-white/5 shadow-2xl lg:shadow-none"
                            >

                        {/* Panel Header */}
                        <div className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-white/5 bg-zinc-900/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                                    <Edit3 size={12} className="text-purple-400" />
                                </div>
                                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Editing Center</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {/* Desktop: Close Modal */}
                                <button
                                    onClick={onClose}
                                    className="hidden lg:flex w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-white/30 hover:text-white transition-all"
                                    title="Close Editor"
                                >
                                    <X size={14} />
                                </button>
                                {/* Mobile: Hide Sidebar */}
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="lg:hidden w-7 h-7 flex rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-white/30 hover:text-white transition-all"
                                    title="Hide Tools"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {activePanel === 'tools' ? (
                                <div className="p-5 space-y-5">
                                    {/* Navigation to Asset Manager */}
                                    <button 
                                        onClick={() => setActivePanel('images')}
                                        className="w-full p-4 bg-white/[0.03] border border-white/8 rounded-2xl flex items-center justify-between hover:bg-white/8 hover:border-white/15 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                                                <ImageIcon size={16} className="text-sky-400" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Asset Manager</h4>
                                                <p className="text-[9px] text-white/30 italic">{detectedImages.length} images detected</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-white/20 group-hover:translate-x-1 transition-all" />
                                    </button>

                                    <hr className="border-white/5" />

                                    {/* Card: Quick Text Editing */}
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                                        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
                                            <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                                                <Type size={11} className="text-sky-400" />
                                            </div>
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Quick Text Edition</span>
                                        </div>
                                        <div className="px-5 py-4">
                                            <p className="text-[11px] text-white/40 leading-relaxed">
                                                To fix typos without AI credits, click <strong className="text-sky-400">Text Editor</strong> above, then click any text in the preview to edit it directly.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Card: AI Style Overhaul */}
                                    <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-purple-500/10 flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/25 flex items-center justify-center">
                                                <Bot size={11} className="text-purple-400" />
                                            </div>
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">AI Style Overhaul</span>
                                            <div className="ml-auto w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                                        </div>
                                        <div className="p-5 space-y-5">
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-1.5 text-[10px] font-black text-purple-400/60 uppercase tracking-widest">
                                                    AI Engine
                                                </label>
                                                <select
                                                    value={modelId}
                                                    onChange={(e) => setModelId(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/8 hover:border-purple-500/30 focus:border-purple-500/50 rounded-xl px-4 py-3 text-[11px] font-bold text-white outline-none appearance-none cursor-pointer transition-all"
                                                >
                                                    <optgroup label="Cross-Engine" className="bg-zinc-900">
                                                        <option value="gemini-3-1-pro">🟢 Gemini 3.1 Pro</option>
                                                        <option value="claude-sonnet-4-6">🔵 Claude Sonnet 4.6</option>
                                                        <option value="gpt-5-2">🟡 GPT 5.2</option>
                                                    </optgroup>
                                                    <optgroup label="OpenRouter Only" className="bg-zinc-900">
                                                        <option value="deepseek-v4-pro">🟣 DeepSeek V4 Pro</option>
                                                        <option value="qwen3.6-plus">🟠 Qwen 3.6 Plus</option>
                                                    </optgroup>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-1.5 text-[10px] font-black text-white/30 uppercase tracking-widest">
                                                    <Palette size={11} className="text-purple-400/60" /> Target Style
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedStyle}
                                                        onChange={(e) => setSelectedStyle(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/8 hover:border-purple-500/30 focus:border-purple-500/50 rounded-xl px-4 py-3 text-[11px] font-bold text-white outline-none appearance-none cursor-pointer transition-all pr-10"
                                                    >
                                                        <option value="" className="bg-zinc-900 italic text-white/40">None / Pure Magic Override</option>
                                                        {styles.map(s => (
                                                            <option key={s.id} value={s.id} className="bg-zinc-900">{s.icon} {s.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-1.5 text-[10px] font-black text-white/30 uppercase tracking-widest">
                                                    <Wand2 size={11} className="text-purple-400/60" /> Magic Overrides
                                                </label>
                                                <textarea
                                                    value={magicPrompt}
                                                    onChange={(e) => setMagicPrompt(e.target.value)}
                                                    rows={4}
                                                    placeholder="e.g. Change button color to pastel pink..."
                                                    className="w-full bg-black/40 border border-white/8 hover:border-purple-500/20 focus:border-purple-500/40 rounded-xl p-3.5 text-[11px] font-medium text-white/70 placeholder:text-white/20 outline-none resize-none transition-all leading-relaxed"
                                                />
                                            </div>
                                            <button
                                                onClick={handleAIRegenerate}
                                                disabled={isRegenerating}
                                                className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                                    isRegenerating
                                                    ? 'bg-purple-500/15 text-purple-400/60 cursor-not-allowed border border-purple-500/20'
                                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-800/40'
                                                }`}
                                            >
                                                {isRegenerating ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin text-accent-gold" />
                                                        Processing {jobProgress}%
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={13} />
                                                        Force AI Regeneration
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {isModified && (
                                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-center gap-3">
                                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />
                                            <p className="text-[10px] text-amber-400/80 font-bold leading-relaxed">
                                                You have unsaved changes. Hit <strong>Save HTML</strong> to apply.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-5 space-y-5 flex flex-col h-full">
                                    <div className="flex items-center justify-between shrink-0">
                                        <button 
                                            onClick={() => { setActivePanel('tools'); setActiveImageId(null); }}
                                            className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-all flex items-center gap-1"
                                        >
                                            <X size={12} /> Back to Tools
                                        </button>
                                        <span className="text-[10px] font-black text-accent-gold uppercase tracking-widest">Detected: {detectedImages.length}</span>
                                    </div>

                                    {isScanning ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <RefreshCw size={24} className="animate-spin text-accent-gold" />
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Scanning Images...</span>
                                        </div>
                                    ) : !activeImageId ? (
                                        <div className="grid grid-cols-2 gap-3 pb-8">
                                            {detectedImages.map((img) => (
                                                <button
                                                    key={img.id}
                                                    onMouseEnter={() => handleHighlightImage(img.id)}
                                                    onMouseLeave={() => handleHighlightImage(null)}
                                                    onClick={() => { setActiveImageId(img.id); setUnsplashSearch(''); setUnsplashResults([]); }}
                                                    className="relative group aspect-video rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden hover:border-accent-gold/50 transition-all text-left"
                                                >
                                                    <img src={img.src} alt="Detected" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                                                    {img.resolution && (
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-black text-white uppercase tracking-tighter">
                                                            {img.resolution}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-black/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                        <div className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                                                            <ImagePlus size={10} className="text-accent-gold" /> Replace
                                                        </div>
                                                    </div>
                                                    {img.type === 'bg' && (
                                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-zinc-950/80 text-[8px] font-black text-accent-gold border border-accent-gold/20 uppercase tracking-widest leading-none">BG</div>
                                                    )}
                                                </button>
                                            ))}
                                            {detectedImages.length === 0 && (
                                                <div className="col-span-2 py-12 text-center opacity-20 space-y-3">
                                                    <ImageIcon size={32} className="mx-auto" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No images found</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col space-y-5 min-h-0">
                                            <div className="p-4 bg-accent-gold/5 border border-accent-gold/20 rounded-2xl flex items-center gap-4 shrink-0">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black">
                                                    <img src={detectedImages.find(i => i.id === activeImageId)?.src} alt="Active" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1 truncate">Replacing Asset</h5>
                                                    <button onClick={() => setActiveImageId(null)} className="text-[9px] font-black text-accent-gold uppercase hover:underline flex items-center gap-1">
                                                        <X size={10} /> Cancel
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                                <div className="relative shrink-0">
                                                    <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                                                    <input 
                                                        type="text"
                                                        placeholder="Search stock photos..."
                                                        value={unsplashSearch}
                                                        onChange={(e) => setUnsplashSearch(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUnsplash()}
                                                        className="w-full bg-black/40 border border-white/10 focus:border-accent-gold/40 rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold outline-none transition-all placeholder:text-white/10 text-white"
                                                    />
                                                    <button 
                                                        onClick={handleSearchUnsplash}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent-gold/10 text-accent-gold rounded-lg hover:bg-accent-gold hover:text-black transition-all"
                                                    >
                                                        {isSearchingUnsplash ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                                                    </button>
                                                </div>

                                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                                    {isSearchingUnsplash ? (
                                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                                            <Loader2 size={20} className="animate-spin text-accent-gold" />
                                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Searching...</span>
                                                        </div>
                                                    ) : unsplashResults.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2 pb-6">
                                                            {unsplashResults.map((photo) => (
                                                                <button
                                                                    key={photo.id}
                                                                    onClick={() => handleReplaceImage(photo.urls.regular)}
                                                                    className="aspect-square rounded-xl overflow-hidden relative group border border-white/5 hover:border-accent-gold transition-all bg-zinc-900"
                                                                >
                                                                    <img src={photo.urls.small} alt={photo.alt_description} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                                                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-black text-white uppercase tracking-tighter">
                                                                        {photo.width}x{photo.height}
                                                                    </div>
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                        <Check size={20} className="text-accent-gold" />
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-15">
                                                            <ImageIcon size={32} />
                                                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Search professional<br/>Unsplash library</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

                    {/* ── Toast ── */}
                    <AnimatePresence>
                        {toast && (
                            <motion.div
                                key="toast"
                                initial={{ opacity: 0, y: 16, x: '-50%' }}
                                animate={{ opacity: 1, y: 0, x: '-50%' }}
                                exit={{ opacity: 0, y: 16, x: '-50%' }}
                                className="absolute bottom-6 left-1/2 z-[300] bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 whitespace-nowrap"
                            >
                                <CheckCircle2 size={14} className={toast.type === 'success' ? 'text-green-400' : 'text-sky-400'} />
                                <p className="text-[11px] font-black uppercase tracking-widest text-white">{toast.msg}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

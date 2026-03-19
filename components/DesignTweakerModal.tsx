'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings2, X, Zap, ChevronDown, Loader2, 
    Sparkles, Palette, Search, Check
} from 'lucide-react';
import { getStyleModels, refineLeadStyle, getRecommendedStyles } from '@/lib/actions/ai';

interface DesignTweakerModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
    onSuccess?: (newPrompt: string) => void;
}

export default function DesignTweakerModal({ isOpen, onClose, lead, onSuccess }: DesignTweakerModalProps) {
    const [allStyles, setAllStyles] = useState<any[]>([]);
    const [recommendedStyleIds, setRecommendedStyleIds] = useState<string[]>([]);
    const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isLoadingStyles, setIsLoadingStyles] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (isOpen && lead) {
            loadStyles();
        }
    }, [isOpen, lead]);

    const loadStyles = async () => {
        setIsLoadingStyles(true);
        try {
            const [styles, recommendations] = await Promise.all([
                getStyleModels(),
                getRecommendedStyles(lead.category)
            ]);
            if (styles) setAllStyles(styles);
            if (recommendations) setRecommendedStyleIds(recommendations);
        } catch (error) {
            console.error("Failed to load styles:", error);
        } finally {
            setIsLoadingStyles(false);
        }
    };

    const filteredStyles = useMemo(() => {
        return allStyles
            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.description.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => {
                const aRec = recommendedStyleIds.includes(a.id) ? 1 : 0;
                const bRec = recommendedStyleIds.includes(b.id) ? 1 : 0;
                return bRec - aRec;
            });
    }, [allStyles, searchQuery, recommendedStyleIds]);

    const selectedStyle = useMemo(() => 
        allStyles.find(s => s.id === selectedStyleId), 
    [allStyles, selectedStyleId]);

    const handleRefine = async () => {
        if (!selectedStyleId) {
            alert("Pilih style terlebih dahulu");
            return;
        }
        
        setIsRegenerating(true);
        try {
            const res = await refineLeadStyle(lead.id, selectedStyleId);
            if (res.success) {
                if (onSuccess) onSuccess("");
                onClose();
            } else {
                alert(res.message);
            }
        } catch (e) {
            alert("Gagal memperbarui blueprint");
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isRegenerating && onClose()}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                                    <Palette className="text-amber-400" /> Style Refiner
                                </h2>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                                    DNA Evolution for <span className="text-white">{lead?.name}</span>
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                disabled={isRegenerating}
                                className="p-3 hover:bg-white/5 rounded-2xl text-white/20 hover:text-white transition-all disabled:opacity-50 border border-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 flex-1 overflow-visible">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Select Visual DNA Model</label>
                                
                                {/* Custom Searchable Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        disabled={isRegenerating || isLoadingStyles}
                                        className={`w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl px-6 flex items-center justify-between transition-all hover:bg-white/5 text-left ${isDropdownOpen ? 'border-amber-400/50 ring-4 ring-amber-400/5' : ''}`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            {selectedStyle ? (
                                                <>
                                                    <span className="text-2xl">{selectedStyle.icon}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-white uppercase truncate">{selectedStyle.name}</p>
                                                        <p className="text-[10px] text-white/40 truncate">{selectedStyle.description}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs font-black text-white/20 uppercase tracking-widest">
                                                    {isLoadingStyles ? 'Scanning Style library...' : 'Choose a style...'}
                                                </span>
                                            )}
                                        </div>
                                        {isLoadingStyles ? (
                                            <Loader2 className="animate-spin text-white/20" size={18} />
                                        ) : (
                                            <ChevronDown className={`text-white/20 transition-transform ${isDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} size={18} />
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {isDropdownOpen && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute z-[300] top-full mt-2 w-full bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl"
                                            >
                                                <div className="p-4 border-b border-white/5 bg-white/5">
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            placeholder="Search 20+ models..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-amber-400/50 transition-all font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                                    {filteredStyles.map((style) => {
                                                        const isRecommended = recommendedStyleIds.includes(style.id);
                                                        const isSelected = selectedStyleId === style.id;
                                                        return (
                                                            <button
                                                                key={style.id}
                                                                onClick={() => {
                                                                    setSelectedStyleId(style.id);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group hover:bg-white/5 ${isSelected ? 'bg-amber-400/10' : ''}`}
                                                            >
                                                                <span className={`text-2xl transition-transform group-hover:scale-125 ${isSelected ? 'scale-110' : ''}`}>
                                                                    {style.icon}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-amber-400' : 'text-white/60 group-hover:text-white'}`}>
                                                                            {style.name}
                                                                        </span>
                                                                        {isRecommended && (
                                                                            <span className="px-1.5 py-0.5 bg-amber-400 text-black text-[7px] font-black uppercase rounded-sm flex items-center gap-1">
                                                                                <Zap size={6} fill="currentColor" /> REC
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] text-white/20 truncate group-hover:text-white/40">{style.description}</p>
                                                                </div>
                                                                {isSelected && <Check size={14} className="text-amber-400" />}
                                                            </button>
                                                        );
                                                    })}
                                                    {filteredStyles.length === 0 && (
                                                        <div className="py-8 text-center text-white/20 text-[10px] font-black uppercase">No models match your search.</div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="p-6 bg-amber-400/5 border border-amber-400/10 rounded-3xl space-y-2">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles size={12} /> Blueprint Evolution
                                </p>
                                <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                                    Action ini akan memperbarui "Master Blueprint" lead ini dengan DNA desain yang dipilih. Perubahan bersifat kumulatif dan tidak dikenakan biaya kredit tambahan selama fase blueprint.
                                </p>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-8 border-t border-white/5 bg-zinc-900/30">
                            <button 
                                onClick={handleRefine}
                                disabled={isRegenerating || !selectedStyleId}
                                className="w-full h-16 bg-amber-400 hover:bg-amber-300 disabled:bg-white/5 disabled:text-white/20 text-black font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-amber-900/10 uppercase tracking-widest text-sm"
                            >
                                {isRegenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Analyzing & Evolving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>Evolve Master Blueprint</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

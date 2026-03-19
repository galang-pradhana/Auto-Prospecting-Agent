'use client';

import { useState, useEffect } from 'react';
import { 
    Cpu, MessageSquare, Flame, Save, 
    X, Loader2, Info, CheckCircle2, 
    AlertTriangle, Shield, Settings2, 
    Key, Database, Trash2, Plus, Zap, Wand2,
    Brain, RotateCcw, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    getWaTemplates, saveWaTemplate, deleteWaTemplate, setDefaultWaTemplate,
    generateWaTemplateDraft,
    getUserSettings, updateUserSettings
} from '@/lib/actions/settings';
import { checkScraperHealth, repairScraperPermissions } from '@/lib/actions/scraper';
import { getKieCredit } from '@/lib/actions/ai';
import {
    getCurrentPromptStates, updateSystemPrompt, resetSystemPrompt,
    type PromptName
} from '@/lib/actions/prompt';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'ai' | 'wa' | 'health' | 'logic'>('ai');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingDraft, setGeneratingDraft] = useState(false);
    
    // --- AI Settings State ---
    const [apiKey, setApiKey] = useState('');
    const [byocMode, setByocMode] = useState(false);
    const [aiEngine, setAiEngine] = useState('gemini-3-flash');
    const [estimatedUsage, setEstimatedUsage] = useState("0");

    // --- WA Templates State ---
    const [templates, setTemplates] = useState<any[]>([]);
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waTitle, setWaTitle] = useState('');
    const [waCategory, setWaCategory] = useState('');
    const [waMessage, setWaMessage] = useState('');
    const [waIsDefault, setWaIsDefault] = useState(false);
    const [waEditId, setWaEditId] = useState<string | null>(null);

    // --- System Health State ---
    const [health, setHealth] = useState<any>(null);
    const [repairing, setRepairing] = useState(false);

    // --- AI Logic State ---
    const [promptStates, setPromptStates] = useState<Record<string, { current: string; isOverride: boolean; default: string; label: string }>>({});
    const [selectedPrompt, setSelectedPrompt] = useState<PromptName>('MASTER_FORGE_PROMPT');
    const [promptContent, setPromptContent] = useState('');
    const [savingPrompt, setSavingPrompt] = useState(false);
    const [resettingPrompt, setResettingPrompt] = useState(false);

    // --- Toast / Feedback ---
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        loadAllData();
        const healthInterval = setInterval(loadHealth, 10000);
        return () => clearInterval(healthInterval);
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        const [settings, usage, waData, healthData, promptData] = await Promise.all([
            getUserSettings(),
            getKieCredit(),
            getWaTemplates(),
            checkScraperHealth(),
            getCurrentPromptStates()
        ]);

        if (settings) {
            setApiKey(settings.kieAiApiKey || '');
            setByocMode(settings.byocMode);
            setAiEngine(settings.aiEngine || 'gemini-3-flash');
        }
        setEstimatedUsage(usage.toString());
        setTemplates(waData);
        setHealth(healthData);
        if (promptData) {
            setPromptStates(promptData);
            const first = Object.keys(promptData)[0] as PromptName;
            if (first) {
                setSelectedPrompt(first);
                setPromptContent(promptData[first].current);
            }
        }
        setLoading(false);
    };

    const loadHealth = async () => {
        const h = await checkScraperHealth();
        setHealth(h);
    };

    // --- AI Configuration Actions ---
    const handleSaveAiSettings = async () => {
        setSaving(true);
        const res = await updateUserSettings({ kieAiApiKey: apiKey, byocMode, aiEngine });
        if (res.success) showToast("AI configurations updated");
        else showToast(res.message || "Failed to update", "error");
        setSaving(false);
    };

    // --- WA Template Actions ---
    const handleSaveWaTemplate = async () => {
        if (!waTitle || !waMessage) {
            showToast("Title and Content are required", "error");
            return;
        }
        setSaving(true);
        const res = await saveWaTemplate(waEditId, waTitle, waCategory, waMessage, waIsDefault);
        if (res.success) {
            const data = await getWaTemplates();
            setTemplates(data);
            setIsWaModalOpen(false);
            setWaTitle('');
            setWaCategory('');
            setWaMessage('');
            setWaIsDefault(false);
            setWaEditId(null);
            showToast("Template saved");
        } else {
            showToast(res.message || "Failed to save template", "error");
        }
        setSaving(false);
    };

    const handleGenerateDraft = async () => {
        if (!waCategory) {
            showToast("Please enter a category first", "error");
            return;
        }
        setGeneratingDraft(true);
        const res = await generateWaTemplateDraft(waCategory);
        if (res.success && res.draft) {
            setWaMessage(res.draft);
            showToast("High-conversion draft generated!");
        } else {
            showToast(res.message || "Generation failed", "error");
        }
        setGeneratingDraft(false);
    };

    const handleSetDefaultWaTemplate = async (id: string, isDefault: boolean) => {
        if (isDefault) return; // Already default

        const res = await setDefaultWaTemplate(id);
        if (res.success) {
            const data = await getWaTemplates();
            setTemplates(data);
            showToast("Default template updated");
        } else {
            showToast(res.message || "Failed to set default template", "error");
        }
    };

    const handleDeleteWaTemplate = async (id: string) => {
        if (!confirm('Hapus template ini?')) return;
        const res = await deleteWaTemplate(id);
        if (res.success) {
            setTemplates(prev => prev.filter(t => t.id !== id));
            showToast("Template deleted");
        }
    };

    // --- Health Actions ---
    const handleRepairPermissions = async () => {
        setRepairing(true);
        const res = await repairScraperPermissions();
        showToast(res.message, res.success ? 'success' : 'error');
        await loadHealth();
        setRepairing(false);
    };

    // --- AI Logic Actions ---
    const handleSelectPrompt = (name: PromptName) => {
        setSelectedPrompt(name);
        setPromptContent(promptStates[name]?.current || '');
    };

    const handleUpdatePrompt = async () => {
        setSavingPrompt(true);
        const res = await updateSystemPrompt(selectedPrompt, promptContent);
        if (res.success) {
            showToast('AI Logic berhasil diperbarui!');
            const freshData = await getCurrentPromptStates();
            setPromptStates(freshData);
        } else {
            showToast(res.message || 'Gagal memperbarui', 'error');
        }
        setSavingPrompt(false);
    };

    const handleResetPrompt = async () => {
        if (!confirm('Are you sure you want to revert this prompt to factory defaults? Your custom changes will be lost.')) return;
        setResettingPrompt(true);
        const res = await resetSystemPrompt(selectedPrompt);
        if (res.success) {
            showToast('Prompt reverted to defaults!');
            const freshData = await getCurrentPromptStates();
            setPromptStates(freshData);
            setPromptContent(freshData[selectedPrompt]?.current || '');
        } else {
            showToast('Failed to reset prompt', 'error');
        }
        setResettingPrompt(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="animate-spin text-accent-gold" size={48} />
                <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">Initializing Surgical Hub...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter text-white uppercase flex items-center gap-3">
                        <Settings2 className="text-accent-gold" /> Application Settings
                    </h1>
                    <p className="text-white/40 italic font-medium">Surgical control panel for AI, Outreach, and Infrastructure.</p>
                </div>
            </header>

            {/* Tabbed Navigation */}
            <div className="flex p-1 bg-zinc-950 border border-white/5 rounded-2xl w-fit flex-wrap">
                {[
                    { id: 'ai', label: 'AI & API', icon: Cpu },
                    { id: 'logic', label: 'AI Logic', icon: Brain },
                    { id: 'wa', label: 'WA Outreach', icon: MessageSquare },
                    { id: 'health', label: 'System Health', icon: Flame },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id 
                            ? 'bg-white text-black shadow-lg' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="relative">
                <AnimatePresence mode="wait">
                    {/* Section 1: AI & API Configuration */}
                    {activeTab === 'ai' && (
                        <motion.div
                            key="ai"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 shadow-2xl space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Zap className="text-accent-gold" size={16} /> AI Engine Selection
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Selected Model Provider</label>
                                                    <div className="relative group/select">
                                                        <Cpu size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/select:text-accent-gold transition-colors" />
                                                        <select
                                                            value={aiEngine}
                                                            onChange={(e) => setAiEngine(e.target.value)}
                                                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-10 pr-12 py-4 appearance-none outline-none focus:border-accent-gold/40 transition-all text-sm font-black uppercase tracking-widest text-white cursor-pointer"
                                                        >
                                                            <option key="gemini-3-flash" value="gemini-3-flash" className="bg-zinc-950">Kie.ai: Gemini 3 Flash</option>
                                                            <option key="o1" value="o1" className="bg-zinc-950">Kie.ai: O1</option>
                                                            <option key="gpt-4o" value="gpt-4o" className="bg-zinc-950">Kie.ai: GPT-4o</option>
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5">
                                            <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Key className="text-accent-gold" size={16} /> Kie.ai Integration
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">API Endpoint</label>
                                                    <div className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white/40 font-mono">
                                                        https://api.kie.ai/{aiEngine}/v1/chat/completions
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Production API Key</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="password"
                                                            placeholder="sk-kie-..."
                                                            value={apiKey}
                                                            onChange={(e) => setApiKey(e.target.value)}
                                                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-mono"
                                                        />
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/10 uppercase italic">Encrypted</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5">
                                            <div 
                                                className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer hover:border-accent-gold/30 transition-all"
                                                onClick={() => setByocMode(!byocMode)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${byocMode ? 'bg-accent-gold text-black' : 'bg-white/5 text-white/20'}`}>
                                                        <Shield size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white uppercase text-xs tracking-widest">BYOC Mode</p>
                                                        <p className="text-[10px] text-white/40 font-medium">Bring Your Own Credits (Strict API Billing)</p>
                                                    </div>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative transition-all ${byocMode ? 'bg-accent-gold' : 'bg-zinc-800'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${byocMode ? 'left-7 shadow-sm' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="w-16 h-16 rounded-3xl bg-accent-gold/10 flex items-center justify-center text-accent-gold mb-2">
                                                <Database size={32} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Consumption Score</p>
                                                <p className="text-5xl font-black text-white tracking-tighter font-mono">{estimatedUsage}</p>
                                                <p className="text-[10px] font-bold text-accent-gold uppercase tracking-widest mt-2">Kie Credits Used</p>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-4">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '45%' }}
                                                    className="h-full bg-accent-gold"
                                                />
                                            </div>
                                            <p className="text-[9px] text-white/30 italic">Aggregated from Activity Logs per Lead Interaction.</p>
                                        </div>

                                        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-3">
                                            <div className="flex items-center gap-2 text-red-400">
                                                <AlertTriangle size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Warning</span>
                                            </div>
                                            <p className="text-[11px] text-white/60 leading-relaxed">
                                                Changing your API key will affect ongoing Forge and Enrichment processes. Ensure your new key has sufficient credits.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-8 border-t border-white/5">
                                    <button 
                                        onClick={handleSaveAiSettings}
                                        disabled={saving}
                                        className="bg-accent-gold hover:bg-white text-black px-10 py-5 rounded-[24px] font-black text-sm uppercase transition-all flex items-center gap-3 shadow-2xl shadow-accent-gold/10"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        Secure Save Configuration
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Section 2: AI Logic / Prompt Manager */}
                    {activeTab === 'logic' && (
                        <motion.div
                            key="logic"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 shadow-2xl space-y-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                            <Brain className="text-accent-gold" size={16} /> Prompt Engineering Console
                                        </h3>
                                        <p className="text-[10px] text-white/40 font-medium mt-1 italic">Override AI instructions directly. Changes apply immediately to Forge & Enrich processes.</p>
                                    </div>
                                    {promptStates[selectedPrompt]?.isOverride && (
                                        <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Custom Override Active</span>
                                        </div>
                                    )}
                                </div>

                                {/* Prompt Selector Dropdown */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Select Prompt Type</label>
                                    <div className="relative group/select">
                                        <Brain size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-hover/select:text-accent-gold transition-colors" />
                                        <select
                                            value={selectedPrompt}
                                            onChange={(e) => handleSelectPrompt(e.target.value as PromptName)}
                                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-10 pr-12 py-4 appearance-none outline-none focus:border-accent-gold/40 transition-all text-sm font-black uppercase tracking-widest text-white cursor-pointer"
                                        >
                                            {Object.entries(promptStates).map(([key, val]) => (
                                                <option key={key} value={key} className="bg-zinc-950">
                                                    {val.label} {val.isOverride ? '(Custom)' : '(Default)'}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Prompt Textarea */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Prompt Content</label>
                                        <span className="text-[9px] text-white/20 font-mono">{promptContent.length} chars</span>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute top-0 left-0 w-full p-6 bg-accent-gold/5 border-b border-white/5 rounded-t-2xl z-10">
                                            <div className="flex items-center gap-2">
                                                <Shield className="text-accent-gold" size={12} />
                                                <span className="text-[10px] font-black text-accent-gold uppercase tracking-widest">Logical Lock Active: Permanently Prepend instructions</span>
                                            </div>
                                            <p className="text-[10px] text-white/40 mt-1 font-mono italic">MANDATORY: Bahasa Indonesia & Cinematic Hero</p>
                                        </div>
                                        <textarea
                                            rows={18}
                                            value={promptContent}
                                            onChange={(e) => setPromptContent(e.target.value)}
                                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 pt-24 pb-5 outline-none focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20 transition-all text-[12px] font-mono leading-relaxed resize-none text-white/80 custom-scrollbar"
                                            placeholder="System prompt content..."
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-white/5">
                                    <button
                                        onClick={handleResetPrompt}
                                        disabled={resettingPrompt || !promptStates[selectedPrompt]?.isOverride}
                                        className="flex-1 py-4 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-red-400 transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed"
                                    >
                                        {resettingPrompt ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                        Reset to Default
                                    </button>
                                    <button
                                        onClick={handleUpdatePrompt}
                                        disabled={savingPrompt}
                                        className="flex-[2] py-4 bg-accent-gold hover:bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-2xl shadow-accent-gold/10"
                                    >
                                        {savingPrompt ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Update Logic
                                    </button>
                                </div>

                                {/* Info Box */}
                                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex gap-4">
                                    <Info className="text-blue-400 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-white uppercase tracking-widest">Cara Kerja</p>
                                        <p className="text-[11px] text-white/50 leading-relaxed">
                                            Prompt yang disimpan di sini akan meng-override instruksi default di <code className="text-accent-gold">lib/prompts.ts</code>. Jika Anda mereset, sistem akan kembali menggunakan instruksi bawaan. Ini langsung berlaku pada proses Enrichment dan Forge berikutnya.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Section 3: WA Template Engine */}
                    {activeTab === 'wa' && (
                        <motion.div
                            key="wa"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 space-y-6">
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                            <Info className="text-accent-gold" size={16} /> Variable Cheat Sheet
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Business Name', code: '{{name}}' },
                                                { label: 'Industry Category', code: '{{category}}' },
                                                { label: 'AI Solution Idea', code: '{{idea}}' },
                                                { label: 'Website Link', code: '{{link}}' },
                                            ].map((v) => (
                                                <div key={v.code} className="flex flex-col gap-1 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{v.label}</span>
                                                    <code className="text-xs text-accent-gold font-mono">{v.code}</code>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-4 bg-amber-400/5 border border-amber-400/10 rounded-2xl">
                                            <p className="text-[10px] text-white/50 leading-relaxed font-medium italic">
                                                Placeholders are case-sensitive. The engine will automatically replace them with real lead data during outreach.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <AnimatePresence mode="popLayout">
                                            {templates.map((t) => (
                                                <motion.div
                                                    layout
                                                    key={t.id}
                                                    className={`glass p-6 rounded-[32px] border-white/5 transition-all flex flex-col justify-between ${t.isDefault ? 'bg-accent-gold/5 border-accent-gold/30' : 'bg-zinc-900/20 hover:border-accent-gold/20'}`}
                                                >
                                                    <div>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <h4 className="text-white font-bold text-sm tracking-tighter uppercase">{t.title}</h4>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    {t.isDefault ? (
                                                                        <span className="px-2 py-0.5 bg-accent-gold/20 text-accent-gold border border-accent-gold/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                            <CheckCircle2 size={10} /> Default
                                                                        </span>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={() => handleSetDefaultWaTemplate(t.id, t.isDefault)}
                                                                            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/40 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                                                                        >
                                                                            Set Default
                                                                        </button>
                                                                    )}
                                                                    {t.category && (
                                                                        <span className="px-2 py-0.5 bg-white/5 rounded-full border border-white/5 text-[9px] font-black text-white/60 uppercase tracking-widest">
                                                                            {t.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1 shrink-0 ml-4">
                                                                <button onClick={() => {
                                                                    setWaEditId(t.id);
                                                                    setWaTitle(t.title);
                                                                    setWaCategory(t.category || '');
                                                                    setWaMessage(t.content);
                                                                    setWaIsDefault(t.isDefault);
                                                                    setIsWaModalOpen(true);
                                                                }} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                                                                    <Settings2 size={14} />
                                                                </button>
                                                                <button onClick={() => handleDeleteWaTemplate(t.id)} className="p-2 hover:bg-red-500/5 rounded-lg text-white/20 hover:text-red-400 transition-all">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-white/60 leading-relaxed line-clamp-3 italic">"{t.content}"</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            <motion.button 
                                                onClick={() => {
                                                    setWaEditId(null);
                                                    setWaTitle('');
                                                    setWaCategory('');
                                                    setWaMessage('');
                                                    setWaIsDefault(false);
                                                    setIsWaModalOpen(true);
                                                }}
                                                className="border-2 border-dashed border-white/5 rounded-[32px] p-8 flex flex-col items-center justify-center gap-3 text-white/20 hover:text-accent-gold hover:border-accent-gold/40 transition-all"
                                            >
                                                <Plus size={32} />
                                                <span className="text-xs font-black uppercase tracking-widest">Add New Template</span>
                                            </motion.button>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Section 3: Scraper & System Health */}
                    {activeTab === 'health' && (
                        <motion.div
                            key="health"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Binary Status', key: 'binaryExists', okMsg: 'Located', failMsg: 'Missing' },
                                        { label: 'Permissions', key: 'isExecutable', okMsg: 'Executable', failMsg: 'Restricted' },
                                        { label: 'Browser Engine', key: 'browserReady', okMsg: 'Ready', failMsg: 'Offline' },
                                    ].map((stat) => {
                                        const isOk = health?.[stat.key];
                                        return (
                                            <div key={stat.label} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isOk ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {isOk ? <CheckCircle2 size={24} /> : <X size={24} />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{stat.label}</p>
                                                    <p className={`font-bold uppercase tracking-[0.2em] text-xs ${isOk ? 'text-white' : 'text-red-400'}`}>
                                                        {isOk ? stat.okMsg : stat.failMsg}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={`p-8 rounded-[32px] border flex items-center justify-between transition-all ${
                                    health?.browserReady ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                                }`}>
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-3xl bg-current opacity-10 flex items-center justify-center">
                                            <Flame size={32} />
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase tracking-tighter text-xl text-white">Scraper Intelligence</h4>
                                            <p className="text-sm font-medium opacity-60">{health?.message || 'Awaiting state calculation...'}</p>
                                        </div>
                                    </div>
                                    
                                    {health && !health.isExecutable && (
                                        <button 
                                            onClick={handleRepairPermissions}
                                            disabled={repairing}
                                            className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-accent-gold transition-all"
                                        >
                                            {repairing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                                            Repair Permissions
                                        </button>
                                    )}
                                </div>

                                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex gap-4">
                                    <Info className="text-blue-400 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-white uppercase tracking-widest">Environment Info</p>
                                        <p className="text-[11px] text-white/50 leading-relaxed">
                                            The scraper runs as a localized binary on this server. Ensure the OS has Chromium dependencies installed to allow Playwright-Go to initialize correctly.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* WA Template Modal */}
            <AnimatePresence>
                {isWaModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsWaModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[40px] shadow-2xl p-8 overflow-hidden"
                        >
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-8 flex items-center gap-3">
                                {waEditId ? "Update Outreach Template" : "New Category Template"}
                            </h2>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Template Title *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Default Outreach, Coffee Shop Special"
                                        value={waTitle}
                                        onChange={(e) => setWaTitle(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-bold tracking-widest text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Specific Category (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Photography Studio"
                                        value={waCategory}
                                        onChange={(e) => setWaCategory(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-bold uppercase tracking-widest text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Message Content *</label>
                                        <button 
                                            onClick={handleGenerateDraft}
                                            disabled={generatingDraft || !waCategory}
                                            className="text-[10px] font-black text-accent-gold hover:text-white disabled:text-white/10 flex items-center gap-1.5 transition-all uppercase tracking-widest"
                                        >
                                            {generatingDraft ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                                            Magic Draft
                                        </button>
                                    </div>
                                    <textarea 
                                        rows={6}
                                        placeholder="Halo {{name}}, saya lihat {{category}} Anda butuh..."
                                        value={waMessage}
                                        onChange={(e) => setWaMessage(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-medium leading-relaxed resize-none text-white focus:ring-1 focus:ring-accent-gold/20"
                                    />
                                    <div className="flex justify-between mt-1 px-1">
                                        <p className="text-[9px] text-white/20 font-medium italic">Supports {'{{name}}, {{pain_points}}, {{idea}}, {{link}}'}</p>
                                        <p className="text-[9px] text-white/20 font-medium">{waMessage.length} characters</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${waIsDefault ? 'bg-accent-gold border-accent-gold text-black' : 'bg-zinc-900 border-white/10 text-transparent group-hover:border-white/30'}`}>
                                            <CheckCircle2 size={14} className={waIsDefault ? 'opacity-100' : 'opacity-0'} />
                                        </div>
                                        <span className="text-sm font-black text-white/60 group-hover:text-white transition-colors uppercase tracking-widest">
                                            Make this the default template
                                        </span>
                                        <input 
                                            type="checkbox" 
                                            checked={waIsDefault} 
                                            onChange={(e) => setWaIsDefault(e.target.checked)}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-[10px] text-white/30 italic mt-2 ml-9">
                                        Default templates are used when no category matches. Only one template can be default.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setIsWaModalOpen(false)}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveWaTemplate}
                                        disabled={saving}
                                        className="flex-[2] py-4 bg-accent-gold hover:bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Store Template
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-10 left-1/2 z-[200] px-8 py-4 rounded-2xl border flex items-center gap-3 backdrop-blur-3xl shadow-2xl ${
                            toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

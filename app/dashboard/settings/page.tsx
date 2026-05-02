'use client';

import { useState, useEffect } from 'react';
import { 
    Cpu, Flame, Save, 
    X, Loader2, Info, CheckCircle2, 
    AlertTriangle, Settings2, 
    Key, Database, Zap, Instagram, Globe, RefreshCw,
    MessageCircle, Building2, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    getAiUsageHistory
} from '@/lib/actions/settings';
import {
    getUserSettings, updateUserSettings
} from '@/lib/actions/user-settings';
import { checkScraperHealth, repairScraperPermissions } from '@/lib/actions/scraper';
import { getKieCredit, getOpenRouterCredit } from '@/lib/actions/ai';
import { checkAiStatus } from '@/lib/actions/settings';
import { cleanupOldLeads } from '@/lib/actions/lead';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'ai' | 'identity' | 'fonnte' | 'health'>('ai');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // --- AI Settings State ---
    const [apiKey, setApiKey] = useState('');
    const [openrouterKey, setOpenrouterKey] = useState('');
    const [htmlModel, setHtmlModel] = useState('gemini-3-1-pro');
    const [estimatedUsage, setEstimatedUsage] = useState("0");
    const [openrouterUsage, setOpenrouterUsage] = useState("0");
    const [testingProvider, setTestingProvider] = useState<'kie' | 'openrouter' | null>(null);

    // --- Identity Settings State ---
    const [businessName, setBusinessName] = useState('');
    const [businessIg, setBusinessIg] = useState('');
    const [businessWa, setBusinessWa] = useState('');

    // --- Fonnte API State ---
    const [fonnteTokens, setFonnteTokens] = useState<string[]>(['', '', '', '', '']);

    // --- System Health State ---
    const [health, setHealth] = useState<any>(null);
    const [repairing, setRepairing] = useState(false);
    const [cleaningLeads, setCleaningLeads] = useState(false);

    // --- AI History State ---
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);

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
        const [settings, usage, orUsage, healthData] = await Promise.all([
            getUserSettings(),
            getKieCredit(),
            getOpenRouterCredit(),
            checkScraperHealth()
        ]);

        if (settings) {
            setApiKey(settings.kieAiApiKey || '');
            setOpenrouterKey(settings.openrouterApiKey || '');
            setHtmlModel(settings.htmlModel || 'gemini-3-1-pro');
            setBusinessName(settings.businessName || '');
            setBusinessIg(settings.businessIg || '');
            setBusinessWa(settings.businessWa || '');
            
            // Load Fonnte Tokens
            let loadedTokens = ['', '', '', '', ''];
            if (settings.fonnteTokens && Array.isArray(settings.fonnteTokens)) {
                for (let i = 0; i < 5; i++) {
                    loadedTokens[i] = settings.fonnteTokens[i] || '';
                }
            }
            setFonnteTokens(loadedTokens);
        }
        setEstimatedUsage(usage.toString());
        setOpenrouterUsage(orUsage.toString());
        setHealth(healthData);
        setLoading(false);
        loadHistory(1);
    };

    const loadHistory = async (page: number) => {
        setHistoryLoading(true);
        const res = await getAiUsageHistory(page, 10);
        if (res.success) {
            setHistory(res.data);
            setHistoryTotalPages(res.totalPages);
            setHistoryCurrentPage(page);
        }
        setHistoryLoading(false);
    };

    const loadHealth = async () => {
        const h = await checkScraperHealth();
        setHealth(h);
    };

    // --- Save Actions ---
    const handleSaveAiSettings = async () => {
        setSaving(true);
        const res = await updateUserSettings({ 
            kieAiApiKey: apiKey,
            openrouterApiKey: openrouterKey,
            htmlModel: htmlModel
        });
        if (res.success) {
            showToast("AI configurations updated");
            // Refresh credits after save
            const [k, o] = await Promise.all([getKieCredit(), getOpenRouterCredit()]);
            setEstimatedUsage(k);
            setOpenrouterUsage(o);
        } else {
            showToast(res.message || "Failed to update", "error");
        }
        setSaving(false);
    };

    const handleTestConnection = async (type: 'kie' | 'openrouter') => {
        setTestingProvider(type);
        const key = type === 'kie' ? apiKey : openrouterKey;
        if (!key) {
            showToast(`API Key ${type === 'kie' ? 'Kie.ai' : 'OpenRouter'} belum diisi.`, 'error');
            setTestingProvider(null);
            return;
        }

        const res = await checkAiStatus(key, type);
        if (res.success) {
            showToast(`${res.engine} Connected! Status: Ready`, 'success');
            if (type === 'kie') setEstimatedUsage(res.credit || '0');
            else setOpenrouterUsage(res.credit || '0');
        } else {
            showToast(`${type.toUpperCase()} Error: ${res.message}`, 'error');
        }
        setTestingProvider(null);
    };

    const handleSaveIdentity = async () => {
        setSaving(true);
        const res = await updateUserSettings({ 
            businessName, 
            businessIg, 
            businessWa 
        });
        if (res.success) {
            showToast("Identity settings updated");
        } else {
            showToast(res.message || "Failed to update", "error");
        }
        setSaving(false);
    };

    const handleSaveFonnte = async () => {
        setSaving(true);
        const cleanTokens = fonnteTokens.map(t => t.trim());
        const res = await updateUserSettings({ fonnteTokens: cleanTokens });
        if (res.success) {
            showToast("Fonnte API tokens updated");
        } else {
            showToast(res.message || "Failed to update", "error");
        }
        setSaving(false);
    };

    // --- Health Actions ---
    const handleRepairPermissions = async () => {
        setRepairing(true);
        const res = await repairScraperPermissions();
        showToast(res.message, res.success ? 'success' : 'error');
        await loadHealth();
        setRepairing(false);
    };

    const handleCleanupLeads = async () => {
        if (!confirm('Hapus semua lead FRESH yang sudah lebih dari 14 hari? Tindakan ini tidak bisa dibatalkan.')) return;
        setCleaningLeads(true);
        const res = await cleanupOldLeads();
        showToast(res.message, res.success ? 'success' : 'error');
        setCleaningLeads(false);
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
                    <p className="text-white/40 italic font-medium">Surgical control panel for AI, Identity, and Infrastructure.</p>
                </div>
            </header>

            {/* Tabbed Navigation */}
            <div className="flex p-1 bg-zinc-950 border border-white/5 rounded-2xl w-fit flex-wrap">
                {[
                    { id: 'ai', label: 'AI & API', icon: Cpu },
                    { id: 'identity', label: 'Identity', icon: Building2 },
                    { id: 'fonnte', label: 'Fonnte API', icon: MessageCircle },
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
                            className="space-y-8"
                        >
                            <div className="space-y-8">
                                <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 shadow-2xl space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="pt-6 border-t border-white/5 space-y-6">
                                                <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                                    <Key className="text-accent-gold" size={16} /> Kie.ai Integration
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center px-1">
                                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Production API Key</label>
                                                            <button 
                                                                onClick={() => handleTestConnection('kie')}
                                                                disabled={testingProvider === 'kie'}
                                                                className="text-[9px] font-black uppercase text-accent-gold hover:text-white transition-colors flex items-center gap-1"
                                                            >
                                                                {testingProvider === 'kie' ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                                                Test Connection
                                                            </button>
                                                        </div>
                                                        <div className="relative">
                                                            <input 
                                                                type="password"
                                                                placeholder="sk-kie-..."
                                                                value={apiKey}
                                                                onChange={(e) => setApiKey(e.target.value)}
                                                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-mono text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2 pt-6 border-t border-white/5">
                                                    <Globe className="text-accent-gold" size={16} /> OpenRouter Integration
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center px-1">
                                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">OpenRouter API Key</label>
                                                            <button 
                                                                onClick={() => handleTestConnection('openrouter')}
                                                                disabled={testingProvider === 'openrouter'}
                                                                className="text-[9px] font-black uppercase text-accent-gold hover:text-white transition-colors flex items-center gap-1"
                                                            >
                                                                {testingProvider === 'openrouter' ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                                                Test Connection
                                                            </button>
                                                        </div>
                                                        <div className="relative">
                                                            <input 
                                                                type="password"
                                                                placeholder="sk-or-v1-..."
                                                                value={openrouterKey}
                                                                onChange={(e) => setOpenrouterKey(e.target.value)}
                                                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-mono text-white"
                                                            />
                                                        </div>
                                                        <p className="text-[9px] text-white/20 italic px-1">Dapatkan key di openrouter.ai/settings/keys</p>
                                                    </div>
                                                </div>



                                                <button 
                                                    onClick={handleSaveAiSettings}
                                                    disabled={saving}
                                                    className="w-full bg-accent-gold hover:bg-white text-black py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-3 shadow-2xl shadow-accent-gold/10"
                                                >
                                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                    Secure Save Configuration
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center space-y-6">
                                                <div className="w-16 h-16 rounded-3xl bg-accent-gold/10 flex items-center justify-center text-accent-gold mb-2">
                                                    <Database size={32} />
                                                </div>
                                                <div className="grid grid-cols-1 gap-6 w-full">
                                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Kie Consumption</p>
                                                        <p className="text-3xl font-black text-white tracking-tighter font-mono">{estimatedUsage}</p>
                                                        <p className="text-[9px] font-bold text-accent-gold uppercase tracking-widest mt-1">Kie Credits</p>
                                                    </div>
                                                    
                                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">OpenRouter Credits</p>
                                                        <p className="text-3xl font-black text-white tracking-tighter font-mono">${openrouterUsage}</p>
                                                        <p className="text-[9px] font-bold text-accent-gold uppercase tracking-widest mt-1">USD Remaining</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 shadow-2xl space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                            <Database className="text-accent-gold" size={16} /> AI Usage History
                                        </h3>
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                                            Page {historyCurrentPage} of {historyTotalPages}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-3xl border border-white/5 bg-zinc-900/20">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Timestamp</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Action</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Target</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {historyLoading ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-20 text-center">
                                                            <Loader2 className="animate-spin text-accent-gold mx-auto mb-2" size={24} />
                                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Digesting Activity...</span>
                                                        </td>
                                                    </tr>
                                                ) : history.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-20 text-center">
                                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">No activities recorded yet.</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    history.map((log) => (
                                                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="text-[11px] font-bold text-white/90">
                                                                    {new Date(log.createdAt).toLocaleDateString()}
                                                                </div>
                                                                <div className="text-[9px] font-medium text-white/30 italic">
                                                                    {new Date(log.createdAt).toLocaleTimeString()}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-tighter text-accent-gold">
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-[11px] font-black text-white uppercase tracking-tighter">
                                                                {log.lead?.name || 'System / Batch'}
                                                            </td>
                                                            <td className="px-6 py-4 text-[10px] font-medium text-white/50 leading-relaxed italic">
                                                                {log.description}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <p className="text-[9px] text-white/30 italic font-medium">Showing latest AI interactions.</p>
                                        <div className="flex gap-2">
                                            <button 
                                                disabled={historyCurrentPage <= 1 || historyLoading}
                                                onClick={() => loadHistory(historyCurrentPage - 1)}
                                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                                            >
                                                Prev
                                            </button>
                                            <button 
                                                disabled={historyCurrentPage >= historyTotalPages || historyLoading}
                                                onClick={() => loadHistory(historyCurrentPage + 1)}
                                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Section 2: Identity Configuration */}
                    {activeTab === 'identity' && (
                        <motion.div
                            key="identity"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 shadow-2xl space-y-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                            <Building2 className="text-accent-gold" size={16} /> Business Identity
                                        </h3>
                                        <p className="text-[10px] text-white/40 font-medium mt-1 italic">This identity will be automatically used as your signature in AI outreach drafts.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Business Name</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-gold transition-colors" size={16} />
                                                <input 
                                                    type="text"
                                                    placeholder="e.g. Surgical Web Solutions"
                                                    value={businessName}
                                                    onChange={(e) => setBusinessName(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-bold text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Instagram Handle</label>
                                            <div className="relative group">
                                                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-gold transition-colors" size={16} />
                                                <input 
                                                    type="text"
                                                    placeholder="e.g. @surgical_web"
                                                    value={businessIg}
                                                    onChange={(e) => setBusinessIg(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-bold text-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">WhatsApp Number</label>
                                            <div className="relative group">
                                                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-gold transition-colors" size={16} />
                                                <input 
                                                    type="text"
                                                    placeholder="e.g. 62812345678"
                                                    value={businessWa}
                                                    onChange={(e) => setBusinessWa(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-bold text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="w-16 h-16 rounded-3xl bg-accent-gold/10 flex items-center justify-center text-accent-gold mb-2">
                                                <Zap size={32} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">Automated Signature</h4>
                                                <p className="text-[11px] text-white/50 leading-relaxed italic">
                                                    {'Halo {{name}}, saya dari '}<strong>{businessName || '[Bisnis Anda]'}</strong>. Anda bisa hubungi saya di IG <strong>{businessIg || '[IG Anda]'}</strong>...
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex gap-4">
                                            <Info className="text-blue-400 shrink-0" size={20} />
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-white uppercase tracking-widest">Tips Outreach</p>
                                                <p className="text-[11px] text-white/50 leading-relaxed">
                                                    Gunakan nama bisnis yang terdengar profesional dan pastikan nomor WA sudah dalam format internasional (contoh: 628xxx).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <button 
                                        onClick={handleSaveIdentity}
                                        disabled={saving}
                                        className="w-full md:w-fit px-12 bg-accent-gold hover:bg-white text-black py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-3 shadow-2xl shadow-accent-gold/10 ml-auto"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Save Business Identity
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Section 3: Fonnte API Configuration */}
                    {activeTab === 'fonnte' && (
                        <motion.div
                            key="fonnte"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="glass p-8 rounded-[40px] border-white/5 bg-zinc-950/40 shadow-2xl space-y-8">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                            <MessageCircle className="text-accent-gold" size={16} /> Fonnte Token Rotation
                                        </h3>
                                        <p className="text-[10px] text-white/40 font-medium mt-1 italic">
                                            Masukkan hingga 5 token Fonnte untuk mengaktifkan fitur Anti-Ban (Token Rotation).
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        {[0, 1, 2, 3, 4].map((index) => (
                                            <div key={index} className="space-y-2">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">
                                                    Token {index + 1}
                                                </label>
                                                <div className="relative group">
                                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-gold transition-colors" size={16} />
                                                    <input 
                                                        type="password"
                                                        placeholder={`Masukkan Token Fonnte ${index + 1}`}
                                                        value={fonnteTokens[index] || ''}
                                                        onChange={(e) => {
                                                            const newTokens = [...fonnteTokens];
                                                            newTokens[index] = e.target.value;
                                                            setFonnteTokens(newTokens);
                                                        }}
                                                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-accent-gold/40 transition-all text-sm font-mono text-white"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-4">
                                            <AlertTriangle className="text-amber-400 shrink-0" size={20} />
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-white uppercase tracking-widest">Anti-Ban Strategy</p>
                                                <p className="text-[11px] text-white/50 leading-relaxed">
                                                    Jika kamu memasukkan lebih dari 1 token, sistem akan secara bergantian (Round-Robin) menggunakan token-token tersebut setiap kali mengirim pesan. Ini sangat disarankan agar beban pengiriman tidak terpusat di satu nomor saja.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <button 
                                        onClick={handleSaveFonnte}
                                        disabled={saving}
                                        className="w-full md:w-fit px-12 bg-accent-gold hover:bg-white text-black py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-3 shadow-2xl shadow-accent-gold/10 ml-auto"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        Save Tokens
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Section 4: Scraper & System Health */}
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
                                    
                                    <div className="flex flex-col md:flex-row gap-4">
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

                                        <button 
                                            onClick={handleCleanupLeads}
                                            disabled={cleaningLeads}
                                            className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all"
                                        >
                                            {cleaningLeads ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            Cleanup Expired Leads (&gt;14d)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

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

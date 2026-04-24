"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Save, RefreshCw, Database } from 'lucide-react';

export default function LocalEditor() {
    const [leads, setLeads] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/local-editor');
            const data = await res.json();
            if (data.leads) setLeads(data.leads);
            if (data.users) setUsers(data.users);
        } catch (error) {
            toast.error("Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdate = async (id: string, field: string, value: string, model: string = 'lead') => {
        setSaving(`${id}-${field}`);
        try {
            const res = await fetch('/api/local-editor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, field, value, model })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Field updated", { duration: 1000 });
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="p-8 bg-black min-h-screen text-white font-sans">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                        <Database className="text-red-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">Local Direct Editor</h1>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">⚠️ Local Only Tool • Bypasses UI Logic</p>
                    </div>
                </div>
                <button 
                    onClick={fetchData}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh Data
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="animate-spin text-red-500" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Accessing Database Core...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Users Table */}
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent-gold"></span>
                            Registered Users (Admin Approval)
                        </h2>
                        <div className="overflow-x-auto border border-white/5 rounded-3xl bg-zinc-900/50">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-zinc-900/80">
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Name</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Email</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Approved (Login Access)</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Created At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 text-sm font-bold">{user.name}</td>
                                            <td className="p-4 text-sm text-white/60">{user.email}</td>
                                            <td className="p-4">
                                                <select 
                                                    defaultValue={user.isApproved ? "true" : "false"}
                                                    onChange={(e) => handleUpdate(user.id, 'isApproved', e.target.value, 'user')}
                                                    className={`text-[10px] font-black uppercase tracking-widest p-2 rounded-lg outline-none ${user.isApproved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                                >
                                                    <option value="false">BLOCKED</option>
                                                    <option value="true">APPROVED</option>
                                                </select>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-white/40">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Leads Table */}
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Leads Database
                        </h2>
                        <div className="overflow-x-auto border border-white/5 rounded-3xl bg-zinc-900/50">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-zinc-900/80">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Business Name</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">WhatsApp</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Instagram</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">City</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Category</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Blast Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Bait Draft</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Outreach Draft</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map(lead => (
                                <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="p-2 min-w-[200px]">
                                        <input 
                                            defaultValue={lead.name}
                                            onBlur={(e) => handleUpdate(lead.id, 'name', e.target.value)}
                                            className="w-full bg-transparent p-2 text-xs font-bold focus:bg-white/5 outline-none rounded-lg border border-transparent focus:border-white/10 transition-all"
                                        />
                                    </td>
                                    <td className="p-2 min-w-[150px]">
                                        <input 
                                            defaultValue={lead.wa}
                                            onBlur={(e) => handleUpdate(lead.id, 'wa', e.target.value)}
                                            className="w-full bg-transparent p-2 text-xs font-mono text-blue-400 focus:bg-white/5 outline-none rounded-lg border border-transparent focus:border-white/10 transition-all"
                                        />
                                    </td>
                                    <td className="p-2 min-w-[150px]">
                                        <input 
                                            defaultValue={lead.ig || ''}
                                            onBlur={(e) => handleUpdate(lead.id, 'ig', e.target.value)}
                                            className="w-full bg-transparent p-2 text-xs text-pink-400 focus:bg-white/5 outline-none rounded-lg border border-transparent focus:border-white/10 transition-all"
                                            placeholder="@username"
                                        />
                                    </td>
                                    <td className="p-2 min-w-[150px]">
                                        <input 
                                            defaultValue={lead.city || ''}
                                            onBlur={(e) => handleUpdate(lead.id, 'city', e.target.value)}
                                            className="w-full bg-transparent p-2 text-xs text-white/80 focus:bg-white/5 outline-none rounded-lg border border-transparent focus:border-white/10 transition-all"
                                        />
                                    </td>
                                    <td className="p-2 min-w-[150px]">
                                        <input 
                                            defaultValue={lead.category}
                                            onBlur={(e) => handleUpdate(lead.id, 'category', e.target.value)}
                                            className="w-full bg-transparent p-2 text-xs text-white/60 focus:bg-white/5 outline-none rounded-lg border border-transparent focus:border-white/10 transition-all"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select 
                                            defaultValue={lead.status}
                                            onChange={(e) => handleUpdate(lead.id, 'status', e.target.value)}
                                            className="bg-zinc-800 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg outline-none"
                                        >
                                            <option value="FRESH">FRESH</option>
                                            <option value="ENRICHED">ENRICHED</option>
                                            <option value="READY">READY</option>
                                            <option value="LIVE">LIVE</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select 
                                            defaultValue={lead.blastStatus || ''}
                                            onChange={(e) => handleUpdate(lead.id, 'blastStatus', e.target.value)}
                                            className="bg-zinc-800 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg outline-none"
                                        >
                                            <option value="">NULL</option>
                                            <option value="PENDING">PENDING</option>
                                            <option value="BAIT_SENT">BAIT_SENT</option>
                                            <option value="REPLIED">REPLIED</option>
                                            <option value="SENT">SENT</option>
                                            <option value="FAILED">FAILED</option>
                                        </select>
                                    </td>
                                    <td className="p-2 min-w-[300px]">
                                        <textarea 
                                            defaultValue={lead.baitDraft || ''}
                                            onBlur={(e) => handleUpdate(lead.id, 'baitDraft', e.target.value)}
                                            className="w-full bg-transparent p-2 text-[10px] focus:bg-white/5 outline-none rounded-lg border border-transparent focus:border-white/10 transition-all min-h-[60px]"
                                        />
                                    </td>
                                    <td className="p-2 min-w-[400px]">
                                        <textarea 
                                            defaultValue={lead.outreachDraft || ''}
                                            onBlur={(e) => handleUpdate(lead.id, 'outreachDraft', e.target.value)}
                                            className="w-full bg-transparent p-2 text-[10px] focus:bg-white/5 outline-none rounded-lg border border-transparent focus:border-white/10 transition-all min-h-[60px]"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </div>
                </div>
            )}
        </div>
    );
}

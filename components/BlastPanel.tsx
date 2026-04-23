"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

export type BlastLead = {
  id: string;
  name: string;
  wa: string | null;
  outreachDraft: string | null;
  blastStatus: string | null;
  blastSentAt: Date | string | null;
  blastScheduledAt: Date | string | null;
  blastError: string | null;
  htmlCode?: string | null;
};

const isLeadReady = (lead: BlastLead) => {
  return Boolean(lead.wa && lead.outreachDraft && lead.htmlCode);
};

interface BlastPanelProps {
  leads: BlastLead[];
  onStatusUpdate?: () => void;
}

export default function BlastPanel({ leads, onStatusUpdate }: BlastPanelProps) {
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"send_now" | "schedule">("send_now");
  const [delay, setDelay] = useState<number>(45);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);
  const [isBlasting, setIsBlasting] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<Record<string, any>>({});
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Filter leads that are eligible for blasting (not sent or pending/scheduled AND ready)
  const eligibleLeads = leads.filter(
    (l) => (l.blastStatus === null || l.blastStatus === "FAILED") && isLeadReady(l)
  );

  const handleSelectAll = () => {
    if (selectedLeadIds.length === eligibleLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(eligibleLeads.map((l) => l.id));
    }
  };

  const handleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds((prev) => prev.filter((leadId) => leadId !== id));
    } else {
      setSelectedLeadIds((prev) => [...prev, id]);
    }
  };

  const previewLead = leads.find((l) => l.id === previewLeadId);

  // Polling logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBlasting && selectedLeadIds.length > 0) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/blast/status?leadIds=${selectedLeadIds.join(",")}`);
          const data = await res.json();
          if (data.statuses) {
            setLocalStatuses((prev) => ({ ...prev, ...data.statuses }));
            
            // Check if all selected leads are DONE (SENT or FAILED)
            const allDone = selectedLeadIds.every((id) => {
              const status = data.statuses[id]?.status;
              return status === "SENT" || status === "FAILED";
            });

            if (allDone) {
              setIsBlasting(false);
              if (onStatusUpdate) onStatusUpdate();
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 5000); // Poll every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBlasting, selectedLeadIds, onStatusUpdate]);

  const handleBlast = async () => {
    if (selectedLeadIds.length === 0) {
      alert("Pilih minimal 1 lead untuk di-blast.");
      return;
    }

    if (mode === "schedule" && !scheduledAt) {
      alert("Pilih tanggal dan waktu untuk jadwal.");
      return;
    }

    if (mode === "send_now") {
      setIsBlasting(true);
      try {
        const res = await fetch("/api/blast/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds: selectedLeadIds, delaySeconds: delay }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(`Error: ${data.error}`);
          setIsBlasting(false);
        } else {
          // Polling will handle the rest
        }
      } catch (error) {
        alert("Terjadi kesalahan jaringan.");
        setIsBlasting(false);
      }
    } else {
      // Schedule mode
      try {
        const res = await fetch("/api/blast/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds: selectedLeadIds, scheduledAt }),
        });
        const data = await res.json();
        if (res.ok) {
          alert("Berhasil menjadwalkan pesan!");
          if (onStatusUpdate) onStatusUpdate();
        } else {
          alert(`Error: ${data.error}`);
        }
      } catch (error) {
        alert("Terjadi kesalahan jaringan.");
      }
    }
  };

  const handleResetStatus = async (leadId: string, leadName: string) => {
    setResettingId(leadId);
    const t = toast.loading(`Mereset status ${leadName}...`);
    try {
      const res = await fetch("/api/blast/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) {
        setLocalStatuses((prev) => ({ ...prev, [leadId]: { status: null, error: null } }));
        if (onStatusUpdate) onStatusUpdate();
        toast.success(`Status ${leadName} dikembalikan ke Ready.`, { id: t });
      } else {
        toast.error("Gagal mereset status.", { id: t });
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.", { id: t });
    } finally {
      setResettingId(null);
    }
  };

  const getStatusBadge = (lead: BlastLead) => {
    const currentStatus = localStatuses[lead.id]?.status || lead.blastStatus;
    
    switch (currentStatus) {
      case "PENDING":
        return <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Pending</span>;
      case "SENT":
        return <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-green-500/10 text-green-400 border border-green-500/20">Sent</span>;
      case "FAILED":
        return <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>;
      case "SCHEDULED":
        return <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Scheduled</span>;
      default:
        if (isLeadReady(lead)) {
          return <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>;
        } else {
          return <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-zinc-800/50 text-white/30 border border-white/5 whitespace-nowrap">Not Ready</span>;
        }
    }
  };

  return (
    <div className="glass p-8 rounded-[32px] border border-white/5 bg-zinc-950/40 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">WA Blast Panel</h2>
        <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full">Phase 4</span>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-zinc-900/50 rounded-[24px] border border-white/5">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Mode Pengiriman</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("send_now")}
              className={`flex-1 px-4 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === "send_now" ? "bg-accent-gold text-black shadow-lg shadow-accent-gold/20" : "bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}
            >
              Kirim Sekarang
            </button>
            <button
              onClick={() => setMode("schedule")}
              className={`flex-1 px-4 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === "schedule" ? "bg-accent-gold text-black shadow-lg shadow-accent-gold/20" : "bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}
            >
              Jadwalkan
            </button>
          </div>
        </div>

        {mode === "send_now" && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
              Delay antar pesan: <span className="text-accent-gold">{delay} detik</span>
            </label>
            <input
              type="range"
              min="30"
              max="120"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-full accent-accent-gold h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-white/30 mt-2 font-medium">Min. 30 detik untuk menghindari ban WA.</p>
          </div>
        )}

        {mode === "schedule" && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Pilih Waktu (Jadwal)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-sm font-medium text-white outline-none focus:border-accent-gold/50"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
          <span className="text-accent-gold">{selectedLeadIds.length}</span> Leads dipilih dari {eligibleLeads.length} tersedia
        </p>
        <button
          onClick={handleBlast}
          disabled={isBlasting || selectedLeadIds.length === 0}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            isBlasting || selectedLeadIds.length === 0
              ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-400 text-black shadow-xl shadow-green-500/20 active:scale-95"
          }`}
        >
          {isBlasting ? "Memproses..." : mode === "send_now" ? "Mulai Eksekusi Blast" : "Jadwalkan Blast"}
        </button>
      </div>

      {isBlasting && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-3 animate-pulse">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
          <span className="text-xs font-black uppercase tracking-widest text-green-400">Sedang mengirim pesan... Jangan tutup halaman ini.</span>
        </div>
      )}

      {/* Leads Table */}
      <div className="overflow-x-auto border border-white/5 rounded-2xl bg-zinc-900/30">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedLeadIds.length === eligibleLeads.length && eligibleLeads.length > 0}
                  onChange={handleSelectAll}
                  className="rounded bg-zinc-900 border-white/10 text-accent-gold focus:ring-accent-gold/50"
                />
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Nama Bisnis</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">No. WA</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Status Blast</th>
              <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-white/30">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((lead) => {
              const isEligible = (lead.blastStatus === null || lead.blastStatus === "FAILED") && isLeadReady(lead);
              const errorMsg = localStatuses[lead.id]?.error || lead.blastError;
              const isSelected = selectedLeadIds.includes(lead.id);
              
              const currentStatus = localStatuses[lead.id]?.status || lead.blastStatus;
              
              return (
                <React.Fragment key={lead.id}>
                  <tr className={`transition-colors hover:bg-white/[0.02] ${isSelected ? "bg-accent-gold/5" : ""}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectLead(lead.id)}
                        disabled={!isEligible}
                        className="rounded bg-zinc-900 border-white/10 text-accent-gold focus:ring-accent-gold/50 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">
                      {lead.name}
                      {errorMsg && <p className="text-[10px] font-medium text-red-400 mt-1 max-w-[250px] truncate">{errorMsg}</p>}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-white/60">
                      {lead.wa || <span className="text-red-400/50 italic">Kosong</span>}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(lead)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {currentStatus && (
                          <button
                            onClick={() => handleResetStatus(lead.id, lead.name)}
                            disabled={resettingId === lead.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            title="Reset Status ke Ready"
                          >
                            {resettingId === lead.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            Reset
                          </button>
                        )}
                        <button
                          onClick={() => setPreviewLeadId(previewLeadId === lead.id ? null : lead.id)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all border border-white/5"
                        >
                          {previewLeadId === lead.id ? "Tutup Preview" : "Preview Pesan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Accordion Expanded Row for Preview */}
                  {previewLeadId === lead.id && (
                    <tr className="bg-zinc-950/60 border-b border-white/5">
                      <td colSpan={5} className="px-8 py-6">
                        <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-gold">Preview Pesan Draf AI</h4>
                          <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl whitespace-pre-wrap text-xs text-zinc-300 font-mono shadow-inner leading-relaxed">
                            {lead.outreachDraft ? lead.outreachDraft : <span className="text-white/20 italic">Belum ada draf pesan AI (outreachDraft kosong).</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-white/30 text-xs font-bold uppercase tracking-widest">
                  Tidak ada data lead tersedia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

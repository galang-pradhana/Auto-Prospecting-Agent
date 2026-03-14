import React from 'react';
import Link from 'next/link';
import {
    Home,
    Settings,
    CreditCard,
    LogOut,
    Sparkles,
    Flame,
    Database,
    Cpu,
    Globe
} from 'lucide-react';
import { getKieCredit } from '@/lib/actions';
import { getCurrentUser, logoutUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');

    const credit = await getKieCredit();

    const navItems = [
        { label: 'Home', icon: Home, href: '/dashboard' },
        { label: 'Scraper', icon: Flame, href: '/dashboard/scraper' },
        { label: 'Leads', icon: Database, href: '/dashboard/leads' },
        { label: 'Enriched', icon: Cpu, href: '/dashboard/enriched' },
        { label: 'Live Sites', icon: Globe, href: '/dashboard/live' },
        { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
    ];

    return (
        <div className="flex h-screen bg-premium-900 text-white selection:bg-accent-gold/30">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 flex flex-col glass z-50">
                <div className="p-8">
                    <Link href="/dashboard" className="text-2xl font-black italic tracking-tighter">
                        FORGE<span className="text-accent-gold">.</span>
                    </Link>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1 font-bold">Prospecting Engine</p>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/60 hover:text-white hover:bg-white/5 transition-all group"
                        >
                            <item.icon size={20} className="group-hover:text-accent-gold transition-colors" />
                            <span className="font-semibold text-sm">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-6 mt-auto">
                    <form action={logoutUser}>
                        <button
                            type="submit"
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-400/10 w-full transition-all"
                        >
                            <LogOut size={20} />
                            <span className="font-semibold text-sm">Logout</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between bg-premium-900/50 backdrop-blur-xl z-40">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold">Dashboard</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-accent-gold/10 border border-accent-gold/20">
                            <CreditCard size={18} className="text-accent-gold" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-accent-gold font-bold uppercase tracking-wider">Kie.ai Credit</span>
                                <span className="text-sm font-black tabular-nums">{credit} USD</span>
                            </div>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-premium-700 border border-white/10 flex items-center justify-center font-bold text-accent-gold">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 bg-[#0A0C10]">
                    {children}
                </main>
            </div>
        </div>
    );
}

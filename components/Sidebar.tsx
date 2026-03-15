'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    Settings,
    LogOut,
    Flame,
    Database,
    Cpu,
    Globe
} from 'lucide-react';
import { logoutUser } from '@/lib/auth';

const navItems = [
    { label: 'Home', icon: Home, href: '/dashboard' },
    { label: 'Scraper', icon: Flame, href: '/dashboard/scraper' },
    { label: 'Leads', icon: Database, href: '/dashboard/leads' },
    { label: 'Enriched', icon: Cpu, href: '/dashboard/enriched' },
    { label: 'Live Sites', icon: Globe, href: '/dashboard/live' },
    { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

interface SidebarProps {
    isMobile?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isMobile, onClose }: SidebarProps) {
    const pathname = usePathname();

    const sidebarClasses = isMobile
        ? "w-full h-full flex flex-col bg-premium-900"
        : "w-64 border-r border-white/5 hidden md:flex flex-col glass z-50 transition-all duration-300";

    return (
        <aside className={sidebarClasses}>
            <div className="p-8">
                <Link href="/dashboard" className="text-2xl font-black italic tracking-tighter">
                    FORGE<span className="text-accent-gold">.</span>
                </Link>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1 font-bold">Prospecting Engine</p>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                                isActive 
                                ? 'bg-accent-gold/10 text-accent-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <item.icon 
                                size={20} 
                                className={isActive ? 'text-accent-gold' : 'group-hover:text-accent-gold transition-colors'} 
                            />
                            <span className="font-semibold text-sm">{item.label}</span>
                        </Link>
                    );
                })}
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
    );
}

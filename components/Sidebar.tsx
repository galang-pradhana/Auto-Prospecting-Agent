'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    X, Building2, MapPin, Star, Globe, Phone, 
    Sparkles, Copy, Check, Zap, Lightbulb,
    Target, Layout, Palette, Code2, AlertCircle, Save, Edit2,
    Instagram, MessageCircle, ExternalLink, ChevronRight,
    LayoutDashboard, Terminal, Package, Users, Settings, LogOut,
    ChevronLeft, Sun, Moon, FilePlus2, Activity, Dna
} from 'lucide-react';
import { logoutUser } from '@/lib/auth';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { AiProviderSwitcher } from './AiProviderSwitcher';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scraper', href: '/dashboard/scraper', icon: Terminal },
    { name: 'Leads Manual', href: '/dashboard/leads-manual', icon: FilePlus2 },
    { name: 'Leads Data', href: '/dashboard/leads', icon: Users },
    { name: 'Enriched', href: '/dashboard/enriched', icon: Sparkles },
    { name: 'Live Sites', href: '/dashboard/live', icon: Globe },
    { name: 'Monitoring', href: '/dashboard/monitoring', icon: Activity },
    { name: 'Brand Blueprint', href: '/dashboard/brand-dna', icon: Dna },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
    isMobile?: boolean;
    onClose?: () => void;
    initialProvider?: string;
}

export function Sidebar({ isMobile, onClose, initialProvider = 'kie' }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { theme, setTheme } = useTheme();
    const [isLoaded, setIsLoaded] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) {
            setIsCollapsed(saved === 'true');
        }
        setIsLoaded(true);
        setMounted(true);
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', String(newState));
    };

    const sidebarClasses = isMobile
        ? "w-full h-full flex flex-col bg-premium-900"
        : `${isCollapsed ? 'w-20' : 'w-64'} border-r border-white/5 hidden md:flex flex-col glass z-50 transition-all duration-300 relative`;

    if (!isLoaded && !isMobile) return <aside className="w-64 border-r border-white/5 hidden md:flex flex-col bg-premium-900" />;

    return (
        <aside className={sidebarClasses}>
            {/* Premium Decorative Glow */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-accent-gold/5 to-transparent opacity-50 pointer-events-none" />

            {isMobile && (
                <div className="absolute top-6 right-6 z-[60]">
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 text-white/40 hover:text-white rounded-xl transition-all border border-white/10 shadow-2xl backdrop-blur-xl active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {!isMobile && (
                <button
                    onClick={toggleCollapse}
                    className="absolute -right-3 top-20 bg-accent-gold text-black rounded-full p-1 border-4 border-premium-950 hover:scale-110 transition-transform z-[60]"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            )}

            <div className={`p-6 relative z-10 ${isCollapsed && !isMobile ? 'px-4 flex justify-center' : ''} ${isMobile ? 'pb-2 pt-6' : ''}`}>
                <Link href="/dashboard" className="group relative flex items-center gap-1 transition-transform active:scale-95">
                    <span className={`text-xl md:text-2xl font-black italic tracking-tighter ${isCollapsed && !isMobile ? "hidden" : "block"}`}>
                        FORGE
                    </span>
                    <span className="text-accent-gold text-xl md:text-2xl font-black italic">.</span>
                    {isCollapsed && !isMobile && <span className="text-xs font-black bg-accent-gold text-black px-1.5 py-0.5 rounded-md">F</span>}
                </Link>
                {(!isCollapsed || isMobile) && (
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-[1px] w-3 bg-accent-gold/30" />
                        <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-black">PROSPECTING ENGINE</p>
                    </div>
                )}
            </div>

            <div className={`relative z-10 ${isMobile ? 'px-4 mt-2' : ''}`}>
                <AiProviderSwitcher 
                    initialProvider={initialProvider} 
                    isCollapsed={isCollapsed && !isMobile} 
                />
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto relative z-10 custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group relative overflow-hidden ${
                                isActive 
                                ? 'bg-accent-gold/10 text-white shadow-[0_5px_15px_rgba(212,175,55,0.05)] border border-accent-gold/10' 
                                : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-gradient-to-r from-accent-gold/10 to-transparent -z-10"
                                />
                            )}
                            <item.icon 
                                size={16} 
                                className={`${isActive ? 'text-accent-gold' : 'text-white/30 group-hover:text-accent-gold group-hover:scale-110'} transition-all duration-300`} 
                            />
                            {(!isCollapsed || isMobile) && (
                                <span className={`font-black text-[11px] md:text-[13px] uppercase tracking-wider ${isActive ? 'text-white' : ''}`}>
                                    {item.name}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={`p-4 mt-auto space-y-2 relative z-10 ${isMobile ? 'pb-8 pt-4 border-t border-white/5 bg-zinc-950/90 backdrop-blur-xl' : ''}`}>
                {mounted && (
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-accent-gold/60 hover:text-accent-gold hover:bg-accent-gold/5 w-full transition-all group border border-transparent hover:border-accent-gold/10"
                    >
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent-gold/5 group-hover:bg-accent-gold/10 transition-all">
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        </div>
                        {!isCollapsed && <span className="font-black text-[10px] uppercase tracking-[0.1em]">Theme</span>}
                    </button>
                )}
                <form action={logoutUser} className="w-full">
                    <button
                        type="submit"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500/60 hover:text-red-500 hover:bg-red-500/5 w-full transition-all group border border-transparent hover:border-red-500/10"
                    >
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/5 group-hover:bg-red-500/10 transition-all">
                            <LogOut size={14} />
                        </div>
                        {!isCollapsed && <span className="font-black text-[10px] uppercase tracking-[0.1em]">Logout</span>}
                    </button>
                </form>
            </div>
        </aside>
    );
}

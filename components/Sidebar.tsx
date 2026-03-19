'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Terminal, Package, Users, Sparkles, Globe, Settings,
    LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { logoutUser } from '@/lib/auth';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scraper', href: '/dashboard/scraper', icon: Terminal },
    { name: 'Sandbox', href: '/dashboard/sandbox', icon: Package },
    { name: 'Leads', href: '/dashboard/leads', icon: Users },
    { name: 'Enriched', href: '/dashboard/enriched', icon: Sparkles },
    { name: 'Live Sites', href: '/dashboard/live', icon: Globe },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
    isMobile?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isMobile, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) {
            setIsCollapsed(saved === 'true');
        }
        setIsLoaded(true);
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
            {!isMobile && (
                <button
                    onClick={toggleCollapse}
                    className="absolute -right-3 top-20 bg-accent-gold text-black rounded-full p-1 border-4 border-premium-950 hover:scale-110 transition-transform z-[60]"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            )}

            <div className={`p-8 ${isCollapsed ? 'px-4 flex justify-center' : ''}`}>
                <Link href="/dashboard" className="text-2xl font-black italic tracking-tighter flex items-center">
                    <span className={isCollapsed ? "hidden" : "block"}>FORGE</span>
                    <span className="text-accent-gold">.</span>
                    {isCollapsed && <span className="text-xs ml-1">F</span>}
                </Link>
                {!isCollapsed && <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1 font-bold">Prospecting Engine</p>}
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
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
                            {!isCollapsed && <span className="font-semibold text-sm truncate">{item.name}</span>}
                            {isCollapsed && (
                                <span className="absolute left-16 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[70]">
                                    {item.name}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 mt-auto">
                <form action={logoutUser}>
                    <button
                        type="submit"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-400/10 w-full transition-all group"
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span className="font-semibold text-sm">Logout</span>}
                        {isCollapsed && (
                            <span className="absolute left-16 px-2 py-1 bg-red-950 text-red-400 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[70]">
                                Logout
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </aside>
    );
}

'use client';

import React, { useState } from 'react';
import { CreditCard, Menu } from 'lucide-react';
import { MobileDrawer } from './MobileDrawer';
import GlobalJobIndicator from './GlobalJobIndicator';
import { KieStatusBadge } from './KieStatusBadge';

interface DashboardHeaderProps {
    userName: string;
    credit: string;
}

export function DashboardHeader({ userName, credit }: DashboardHeaderProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <>
            <header className="h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between bg-premium-900/50 backdrop-blur-xl z-40 sticky top-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsDrawerOpen(true)}
                        className="p-2 -ml-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all md:hidden"
                    >
                        <Menu size={24} />
                    </button>
                    <h2 className="text-lg font-bold hidden xs:block">Dashboard</h2>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <GlobalJobIndicator />

                    {/* Unified Kie.ai Status & Credit */}
                    <KieStatusBadge initialCredit={credit} />

                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-premium-700 border border-white/10 flex items-center justify-center font-bold text-accent-gold text-sm md:text-base shrink-0">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            <MobileDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
            />
        </>
    );
}

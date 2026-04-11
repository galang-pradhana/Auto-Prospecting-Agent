import React from 'react';
import { CreditCard } from 'lucide-react';
import { getKieCredit } from '@/lib/actions/ai';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import FollowUpQueue from '@/components/FollowUpQueue';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    
    // Memastikan API call nggak bikin DB connection "nggantung" lama
    const credit = await getKieCredit();

    return (
        <div className="flex h-screen bg-premium-900 text-white selection:bg-accent-gold/30">
            {/* Sidebar (Desktop) */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header (Responsive) */}
                <DashboardHeader userName={user.name} credit={credit} />

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0A0C10]">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
            {/* Global Follow-up Notification Queue */}
            <FollowUpQueue />
        </div>
    );
}

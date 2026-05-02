import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MobileDrawer } from '@/components/MobileDrawer';
import FollowUpQueue from '@/components/FollowUpQueue';
import ActivityMonitor from '@/components/ActivityMonitor';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    
    const { getUserSettings } = await import('@/lib/actions/user-settings');
    const settings = await getUserSettings();
    const initialProvider = settings?.aiProvider || 'kie';

    return (
        <div className="flex h-screen bg-premium-900 text-white selection:bg-accent-gold/30">
            {/* Sidebar (Desktop) */}
            {/* Sidebar (Desktop) */}
            <Sidebar initialProvider={initialProvider} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header (Responsive) */}
                <DashboardHeader userName={user.name} initialProvider={initialProvider} />

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0A0C10]">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
            {/* Global Follow-up Notification Queue */}
            <FollowUpQueue />
            {/* Global Background Activity Monitor */}
            <ActivityMonitor />
        </div>
    );
}

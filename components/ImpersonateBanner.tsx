'use client';

import React from 'react';
import { stopImpersonation } from '@/lib/actions/impersonate';
import { useRouter } from 'next/navigation';
import { EyeOff, UserCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImpersonateBannerProps {
    impersonatedUser: { id: string; name: string; email: string } | null;
}

export function ImpersonateBanner({ impersonatedUser }: ImpersonateBannerProps) {
    const router = useRouter();

    if (!impersonatedUser) return null;

    const handleStop = async () => {
        try {
            await stopImpersonation();
            toast.success('Kembali ke akun Admin');
            // Hard refresh is best to reset all client-side state
            window.location.href = '/dashboard/local-editor';
        } catch (error) {
            toast.error('Gagal menghentikan impersonasi');
        }
    };

    return (
        <div className="w-full bg-yellow-500 text-black px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-bold z-[100] relative shadow-lg">
            <div className="flex items-center gap-2">
                <UserCircle2 size={18} />
                <span>
                    Sedang mengamati sebagai <span className="font-black underline">{impersonatedUser.name}</span>
                </span>
            </div>
            <button 
                onClick={handleStop}
                className="flex items-center gap-2 bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-lg transition-all"
            >
                <EyeOff size={14} />
                <span>Berhenti</span>
            </button>
        </div>
    );
}

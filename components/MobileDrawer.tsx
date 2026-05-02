'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialProvider?: string;
}

export function MobileDrawer({ isOpen, onClose, initialProvider }: MobileDrawerProps) {
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                    />
                    
                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 left-0 w-80 bg-zinc-950 border-r border-white/5 z-[101] md:hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        <Sidebar isMobile onClose={onClose} initialProvider={initialProvider} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

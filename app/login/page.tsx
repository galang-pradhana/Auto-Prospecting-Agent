'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser } from '@/lib/auth';
import { 
    Zap, Mail, Lock, User, ArrowRight, Loader2, 
    Sparkles, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const res = isLogin ? await loginUser(formData) : await registerUser(formData);
        
        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else if (res?.success) {
            router.push('/dashboard');
            // Do not set loading to false so the UI remains in a "loading" state during redirect
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-gold/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[450px] relative z-10"
            >
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-white flex items-center justify-center rounded-[24px] mb-6 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                        <Zap size={32} className="text-black" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                        {isLogin ? 'Welcome Back' : 'Join the Engine'}
                    </h1>
                    <p className="text-white/40 font-medium">
                        Access your surgical prospecting dashboard.
                    </p>
                </div>

                <div className="glass p-10 rounded-[48px] border-white/5 bg-zinc-950/40 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2"
                                >
                                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-gold ml-1">Full Name</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                                        <input 
                                            name="name"
                                            type="text" 
                                            required 
                                            placeholder="Galang A." 
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-white/10 outline-none focus:border-accent-gold/40 focus:ring-4 focus:ring-accent-gold/5 transition-all font-medium"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-gold ml-1">Email Address</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                                <input 
                                    name="email"
                                    type="email" 
                                    required 
                                    placeholder="admin@engine.ai" 
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-white/10 outline-none focus:border-accent-gold/40 focus:ring-4 focus:ring-accent-gold/5 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-accent-gold ml-1">Secure Password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                                <input 
                                    name="password"
                                    type="password" 
                                    required 
                                    placeholder="••••••••" 
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-white/10 outline-none focus:border-accent-gold/40 focus:ring-4 focus:ring-accent-gold/5 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-2"
                            >
                                <ShieldCheck size={14} className="shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full h-16 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-accent-gold transition-all shadow-xl disabled:opacity-50 group"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <span>{isLogin ? 'Ignite Dashboard' : 'Create Account'}</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <button 
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs font-bold text-white/40 hover:text-white transition-colors"
                        >
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <span className="text-accent-gold uppercase tracking-tighter">
                                {isLogin ? 'Join the Fleet' : 'Sign In Now'}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="mt-10 flex items-center justify-center gap-6 opacity-20 grayscale hover:opacity-40 transition-opacity">
                    <Sparkles size={16} className="text-white" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Quantum Engine v5</span>
                    <Sparkles size={16} className="text-white" />
                </div>
            </motion.div>
        </div>
    );
}

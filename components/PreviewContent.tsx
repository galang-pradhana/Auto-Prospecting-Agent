'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Star, ShieldCheck, Zap } from 'lucide-react';

interface PreviewContentProps {
    business: {
        name: string;
        wa: string;
        headline: string;
        subheadline: string;
        testimonials: string[];
    };
}

export default function PreviewContent({ business }: PreviewContentProps) {
    const { wa, headline, subheadline, testimonials } = business;

    return (
        <div className="min-h-screen bg-premium-900 text-white selection:bg-accent-gold/30 overflow-x-hidden">
            {/* Navbar Minimalist */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="fixed top-0 w-full z-50 glass border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center"
            >
                <div className="text-xl font-bold tracking-tight text-white uppercase italic">
                    Forge<span className="text-accent-gold">.</span>
                </div>
                <a
                    href={`https://wa.me/${wa}`}
                    className="hidden md:flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-white/90 transition-all active:scale-95"
                >
                    <MessageCircle size={16} />
                    Claim Website Ini
                </a>
            </motion.nav>

            <main className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
                {/* HERO SECTION */}
                <section className="relative text-center md:text-left mb-32 group">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute -top-20 -left-20 w-64 h-64 bg-accent-gold/20 rounded-full blur-[120px] pointer-events-none group-hover:bg-accent-gold/30 transition-all duration-700"
                    />

                    <div className="relative z-10">
                        <motion.span
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-block px-4 py-1.5 rounded-full glass text-accent-gold text-xs font-bold tracking-widest uppercase mb-6"
                        >
                            Premium Identity Verified
                        </motion.span>
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-5xl md:text-8xl font-black md:leading-[1.1] tracking-tighter mb-8 bg-gradient-to-br from-white via-white/90 to-white/40 bg-clip-text text-transparent"
                        >
                            {headline}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-xl md:text-2xl text-white/60 max-w-3xl leading-relaxed mb-12"
                        >
                            {subheadline}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="flex flex-col md:flex-row gap-4"
                        >
                            <a
                                href={`https://wa.me/${wa}`}
                                className="flex items-center justify-center gap-3 bg-accent-gold text-black px-10 py-5 rounded-2xl font-black text-lg hover:scale-[1.02] transition-all shadow-[0_20px_50px_rgba(212,175,55,0.2)] active:scale-95"
                            >
                                Booking Sekarang
                                <Zap size={20} fill="currentColor" />
                            </a>
                            <div className="flex items-center gap-6 px-4">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-premium-900 bg-premium-700 flex items-center justify-center text-xs font-bold">
                                            U{i}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-sm">
                                    <div className="flex items-center gap-1 text-accent-gold">
                                        <Star size={14} fill="currentColor" />
                                        <Star size={14} fill="currentColor" />
                                        <Star size={14} fill="currentColor" />
                                        <Star size={14} fill="currentColor" />
                                        <Star size={14} fill="currentColor" />
                                    </div>
                                    <p className="text-white/40">Trusted by local community</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* SOCIAL PROOF / REVIEWS SECTION */}
                <section className="mb-32">
                    <div className="flex items-end justify-between mb-12">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">Suara Pelanggan</h2>
                            <p className="text-white/40 italic">Real experiences from verified local customers</p>
                        </motion.div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {(testimonials?.length > 0) ? (
                            testimonials.slice(0, 3).map((testi: string, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.2 }}
                                    className="glass p-8 rounded-[32px] hover:border-white/20 transition-all group hover:-translate-y-2 duration-300"
                                >
                                    <div className="mb-6 flex justify-between items-start">
                                        <div className="bg-accent-gold/10 p-2 rounded-xl text-accent-gold">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div className="flex gap-1 text-accent-gold">
                                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill="currentColor" />)}
                                        </div>
                                    </div>
                                    <p className="text-white/80 leading-relaxed italic text-lg mb-4 line-clamp-4">
                                        "{testi}"
                                    </p>
                                    <div className="flex items-center gap-3 mt-auto">
                                        <div className="w-8 h-1 bg-accent-gold rounded-full" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/30">Verified Customer</span>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center glass rounded-[32px]">
                                <p className="text-white/40 italic text-xl">Verified Business Excellence & Local Integrity</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* FEATURES / VALUE PROP */}
                <motion.section
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="glass rounded-[48px] p-12 md:p-24 overflow-hidden relative border-none"
                >
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-gold/10 rounded-full blur-[150px] -mr-64 -mt-64" />

                    <div className="grid md:grid-cols-2 gap-20 items-center relative z-10">
                        <div>
                            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                                {headline}
                            </h2>
                            <p className="text-white/60 text-lg mb-12">
                                {subheadline}
                            </p>
                            <div className="space-y-6">
                                {[
                                    "Desain responsif untuk mobile device",
                                    "Optimasi SEO lokal di Google Maps",
                                    "Integrasi langsung ke WhatsApp Business"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            whileInView={{ scale: 1 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className="w-2 h-2 rounded-full bg-accent-gold"
                                        />
                                        <span className="text-lg font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="aspect-square glass rounded-3xl flex items-center justify-center p-12 text-center group">
                                <div className="w-full flex flex-col items-center">
                                    <motion.div
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center mb-6 shadow-2xl transition-transform"
                                    >
                                        <MessageCircle size={40} />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold mb-4">Konsultasi Gratis</h3>
                                    <p className="text-white/40 mb-8 max-w-[200px]">Tanya apa saja seputar digitalisasi bisnis Anda.</p>
                                    <a
                                        href={`https://wa.me/${wa}`}
                                        className="w-full py-4 border border-white/10 rounded-2xl hover:bg-white hover:text-black transition-all font-bold"
                                    >
                                        WhatsApp Sekarang
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </main>

            {/* FOOTER */}
            <footer className="py-20 px-6 border-t border-white/5 text-center">
                <div className="text-2xl font-black italic mb-4">
                    Forge<span className="text-accent-gold">.</span>
                </div>
                <p className="text-white/20 text-sm">© 2026 Automated Prospecting Engine. Built for Velocity.</p>
            </footer>
        </div>
    );
}

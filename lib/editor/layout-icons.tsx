import React from 'react';

export const LayoutIcon = ({ type, i }: { type: string, i: number }) => {
    // Return unique SVG icons for each layout type and index
    const base = "w-full h-full fill-none transition-all duration-500";
    const primaryGradient = `url(#grad-primary-${type}-${i})`;
    const secondaryGradient = `url(#grad-secondary-${type}-${i})`;
    
    const Defs = () => (
        <defs>
            <linearGradient id={`grad-primary-${type}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id={`grad-secondary-${type}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
    );

    // Navbar Icons
    if (type === 'navbar') {
        const navIcons = [
            // Floating Pill
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="3" y="7" width="18" height="10" rx="5" stroke={primaryGradient} strokeWidth="1.5" fill={secondaryGradient}/><circle cx="7" cy="12" r="1.5" fill={primaryGradient}/><line x1="11" y1="12" x2="18" y2="12" stroke={primaryGradient} strokeWidth="1.5" strokeLinecap="round"/></svg>,
            // Centered Editorial
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="10" y="4" width="4" height="16" rx="1" fill={primaryGradient} opacity="0.4"/><line x1="2" y1="12" x2="22" y2="12" stroke={primaryGradient} strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke={primaryGradient} strokeWidth="1.5" fill="#000"/></svg>,
            // Minimalist Side
            <svg viewBox="0 0 24 24" className={base}><Defs /><line x1="4" y1="8" x2="10" y2="8" stroke={primaryGradient} strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="8" x2="20" y2="8" stroke={primaryGradient} strokeWidth="2" strokeLinecap="round"/><line x1="16" y1="14" x2="20" y2="14" stroke={primaryGradient} strokeWidth="1.5" opacity="0.5"/></svg>,
            // Glass Bordered
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="5" width="20" height="14" rx="2" stroke={primaryGradient} strokeWidth="1.2" fill={secondaryGradient}/><line x1="2" y1="10" x2="22" y2="10" stroke={primaryGradient} strokeWidth="1" opacity="0.5"/><circle cx="5" cy="7.5" r="0.8" fill={primaryGradient}/></svg>,
            // Dark Split
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="6" height="16" rx="1" fill={primaryGradient}/><rect x="10" y="4" width="12" height="16" rx="1" stroke={primaryGradient} strokeWidth="1" opacity="0.3"/></svg>
        ];
        return navIcons[i % 5];
    }

    // Hero Icons
    if (type === 'hero') {
        const heroIcons = [
            // Split 2026
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="11" height="16" rx="1" fill={primaryGradient} opacity="0.8"/><rect x="14" y="4" width="8" height="16" rx="1" stroke={primaryGradient} strokeWidth="1" opacity="0.2" fill={secondaryGradient}/><line x1="4" y1="10" x2="9" y2="10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
            // Centered Glass
            <svg viewBox="0 0 24 24" className={base}><Defs /><circle cx="12" cy="12" r="9" stroke={primaryGradient} strokeWidth="1" opacity="0.1" fill={secondaryGradient}/><rect x="5" y="8" width="14" height="8" rx="2" stroke={primaryGradient} strokeWidth="1.5" fill="#000" opacity="0.8"/><line x1="8" y1="12" x2="16" y2="12" stroke={primaryGradient} strokeWidth="2" strokeLinecap="round"/></svg>,
            // Big Typography
            <svg viewBox="0 0 24 24" className={base}><Defs /><path d="M4 7h16M4 12h14M4 17h10" stroke={primaryGradient} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/><path d="M4 7h16M4 12h14M4 17h10" stroke="#fff" strokeWidth="0.5" strokeLinecap="round" opacity="0.2"/></svg>,
            // Overlay Modern
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="20" height="16" rx="2" stroke={primaryGradient} strokeWidth="1" fill={secondaryGradient}/><rect x="2" y="13" width="20" height="7" rx="1" fill={primaryGradient} opacity="0.4"/><line x1="5" y1="16.5" x2="12" y2="16.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>,
            // Asymmetric Grid
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="15" height="10" rx="1" fill={primaryGradient}/><rect x="18" y="4" width="4" height="16" rx="1" fill={primaryGradient} opacity="0.2"/><rect x="2" y="15" width="15" height="5" rx="1" stroke={primaryGradient} strokeWidth="1" opacity="0.5" fill={secondaryGradient}/></svg>
        ];
        return heroIcons[i % 5];
    }

    // Feature Icons
    if (type === 'feature') {
        const featIcons = [
            // Bento Grid
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="13" height="9" rx="1.5" fill={primaryGradient}/><rect x="16" y="4" width="6" height="9" rx="1.5" stroke={primaryGradient} strokeWidth="1" opacity="0.3"/><rect x="2" y="14" width="6" height="6" rx="1.5" stroke={primaryGradient} strokeWidth="1" opacity="0.3"/><rect x="9" y="14" width="13" height="6" rx="1.5" fill={primaryGradient} opacity="0.6"/></svg>,
            // Glass List
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="3" y="4" width="18" height="4" rx="1" fill={secondaryGradient} stroke={primaryGradient} strokeWidth="0.5"/><rect x="3" y="10" width="18" height="4" rx="1" fill={secondaryGradient} stroke={primaryGradient} strokeWidth="0.5"/><rect x="3" y="16" width="18" height="4" rx="1" fill={primaryGradient} opacity="0.3"/><circle cx="6" cy="6" r="1" fill={primaryGradient}/><circle cx="6" cy="12" r="1" fill={primaryGradient}/><circle cx="6" cy="18" r="1" fill={primaryGradient}/></svg>,
            // Visual Split
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="10" height="16" rx="1" fill={primaryGradient} opacity="0.2" stroke={primaryGradient} strokeWidth="1"/><line x1="14" y1="8" x2="21" y2="8" stroke={primaryGradient} strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="12" x2="19" y2="12" stroke={primaryGradient} strokeWidth="2" strokeLinecap="round" opacity="0.6"/><line x1="14" y1="16" x2="17" y2="16" stroke={primaryGradient} strokeWidth="2" strokeLinecap="round" opacity="0.3"/></svg>,
            // Icon Grid
            <svg viewBox="0 0 24 24" className={base}><Defs /><circle cx="7" cy="8" r="2.5" fill={primaryGradient}/><circle cx="17" cy="8" r="2.5" fill={primaryGradient} opacity="0.4"/><circle cx="7" cy="16" r="2.5" fill={primaryGradient} opacity="0.4"/><circle cx="17" cy="16" r="2.5" fill={primaryGradient}/></svg>,
            // Modern Marquee
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="8" width="20" height="8" rx="1" fill={secondaryGradient} stroke={primaryGradient} strokeWidth="1" strokeDasharray="3 2"/><text x="12" y="13.5" fontSize="5" fontWeight="900" fill={primaryGradient} textAnchor="middle">MARQUEE_TEXT</text></svg>
        ];
        return featIcons[i % 5];
    }

    // CTA Icons
    if (type === 'cta') {
        const ctaIcons = [
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="4" y="6" width="16" height="12" rx="6" fill={primaryGradient}/><circle cx="12" cy="12" r="2.5" fill="#fff" opacity="0.9"/></svg>,
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="10" height="16" rx="1" fill={primaryGradient}/><rect x="13" y="4" width="9" height="16" rx="1" stroke={primaryGradient} strokeWidth="1" opacity="0.3"/></svg>,
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="4" y="9" width="16" height="6" rx="3" stroke={primaryGradient} strokeWidth="1.5" fill={secondaryGradient}/><rect x="14" y="10.5" width="4" height="3" rx="1.5" fill={primaryGradient}/></svg>,
            <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="2" y="4" width="20" height="16" rx="1" fill={primaryGradient} opacity="0.1"/><path d="M6 10h12M8 14h8" stroke={primaryGradient} strokeWidth="2.5" strokeLinecap="round"/></svg>,
            <svg viewBox="0 0 24 24" className={base}><Defs /><path d="M2 12h20M17 7l5 5-5 5" stroke={primaryGradient} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ];
        return ctaIcons[i % 5];
    }

    // Default icon
    return <svg viewBox="0 0 24 24" className={base}><Defs /><rect x="4" y="4" width="16" height="16" rx="2" stroke={primaryGradient} strokeWidth="1.5" opacity="0.2" fill={secondaryGradient}/></svg>;
};

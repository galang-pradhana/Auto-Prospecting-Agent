'use client';

import { Download } from 'lucide-react';

interface DownloadButtonProps {
    htmlCode: string;
    fileName: string;
    className?: string;
    iconSize?: number;
}

export default function DownloadButton({ htmlCode, fileName, className, iconSize = 14 }: DownloadButtonProps) {
    const handleDownload = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const blob = new Blob([htmlCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace(/\s+/g, '-').toLowerCase()}-website.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleDownload}
            className={className || "p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-accent-gold transition-all"}
            title="Download Source Code"
        >
            <Download size={iconSize} />
        </button>
    );
}

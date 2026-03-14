import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function LiveSiteRoute({ params }: { params: { slug: string } }) {
    // 1. Fetch the lead from the database
    const lead = await prisma.lead.findUnique({
        where: {
            slug: params.slug,
            status: 'LIVE' // Only allow if LIVE
        },
        select: {
            htmlCode: true,
            name: true
        }
    });

    if (!lead || !lead.htmlCode) {
        notFound();
    }

    // 2. Render the stored HTML directly
    // Since this is a server component returning raw HTML, we can just return it.
    // However, to ensure it renders as a full page we return a special layout if needed,
    // but usually the htmlCode should contain the full <html> structure.
    
    return (
        <div 
            dangerouslySetInnerHTML={{ __html: lead.htmlCode }} 
            style={{ width: '100%', height: '100%' }}
        />
    );
}

// Optimization: Ensure this route is dynamic
export const dynamic = 'force-dynamic';
export const metadata = {
    title: 'Live Site Site Viewer',
};

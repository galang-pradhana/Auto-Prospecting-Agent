import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { token: string } }) {
    const { token } = params;

    const submission = await prisma.brandDnaSubmission.findUnique({
        where: { token },
        include: { lead: true }
    });

    if (!submission) {
        return new NextResponse("Not Found", { status: 404 });
    }

    // Update status to VIEWED if still PENDING
    if (submission.status === 'PENDING') {
        await prisma.brandDnaSubmission.update({
            where: { id: submission.id },
            data: { 
                status: 'VIEWED',
                viewedAt: new Date()
            }
        });
    }

    // Read the HTML template
    const htmlPath = path.join(process.cwd(), 'lain-lain', 'brand-dna-web.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Inject data into the HTML
    const existingAnswers = submission.answers ? JSON.stringify(submission.answers) : 'null';

    const gmapsData = {
        name: submission.lead.name || '',
        category: submission.lead.category || '',
        rating: submission.lead.rating ? (submission.lead.rating + (submission.lead.reviewCount ? ` (${submission.lead.reviewCount} ulasan)` : '')) : '',
        phone: submission.lead.wa || '',
        address: submission.lead.address || ''
    };

    const injectScript = `
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <script>
            window.BRAND_DNA_TOKEN = "${token}";
            window.LEAD_ID = "${submission.leadId}";
            window.EXISTING_ANSWERS = ${existingAnswers};
            window.GMAPS_DATA = ${JSON.stringify(gmapsData)};
        </script>
    `;

    // Insert before the main script tag or at the end of head
    if (htmlContent.includes('<script>')) {
        htmlContent = htmlContent.replace('<script>', `${injectScript}\n<script>`);
    } else {
        htmlContent = htmlContent.replace('</head>', `${injectScript}\n</head>`);
    }

    return new NextResponse(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

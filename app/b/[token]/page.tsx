import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export default async function PublicBrandDnaPage({ params }: { params: { token: string } }) {
    const { token } = params;

    const submission = await prisma.brandDnaSubmission.findUnique({
        where: { token },
        include: { lead: true }
    });

    if (!submission) {
        notFound();
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

    // We'll replace the default values in the D object or inject a script to override them
    const injectScript = `
        <script>
            window.BRAND_DNA_TOKEN = "${token}";
            window.EXISTING_ANSWERS = ${existingAnswers};
            window.addEventListener('DOMContentLoaded', () => {
                if (window.EXISTING_ANSWERS && typeof D !== 'undefined') {
                    // Merge existing answers into D
                    Object.assign(D, window.EXISTING_ANSWERS);
                    if (typeof populateUIFromD === 'function') {
                        populateUIFromD();
                    }
                } else if (typeof D !== 'undefined') {
                    // Pre-fill D object if needed
                    D.brand_name = "${submission.lead.name.replace(/"/g, '\\"')}";
                    // Trigger UI update for the first screen if visible
                    const q1Input = document.querySelector('#q1 input');
                    if (q1Input) q1Input.value = D.brand_name;
                }
            });
        </script>
    `;

    // Insert before </body>
    htmlContent = htmlContent.replace('</body>', `${injectScript}</body>`);

    return (
        <div 
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
            className="h-screen w-full overflow-hidden"
        />
    );
}

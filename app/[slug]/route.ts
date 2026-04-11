import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';

// Serve the AI-generated HTML as a raw Response.
// The AI generates full <!DOCTYPE html> documents, so we cannot wrap them
// inside a React <div> — that would produce invalid nested <html> tags
// which breaks script execution (blank page symptom).
export async function GET(request: Request, context: { params: { slug: string } }) {
    const lead = await prisma.lead.findUnique({
        where: {
            slug: context.params.slug,
            status: 'LIVE',
        },
        select: {
            htmlCode: true,
        }
    });

    if (!lead?.htmlCode) {
        return new Response('Not Found', { status: 404 });
    }

    return new Response(lead.htmlCode, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

export const dynamic = 'force-dynamic';

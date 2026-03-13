'use server';

import fs from 'fs/promises';
import path from 'path';
import { slugify } from './utils';

export interface BusinessData {
    name: string;
    wa: string;
    headline: string;
    subheadline: string;
    testimonials: string[];
}

export async function sanitizeBusinessData(data: any): Promise<BusinessData> {
    const ai = data.ai_branding || {};
    const identity = ai.brand_identity || {};

    const headline = identity.tagline || ai.headline || 'Professional Digital Identity';
    const subheadline = identity.positioning || identity.brand_personality || ai.subheadline || 'Elevating your business presence with premium, AI-crafted digital branding.';
    const testimonials = Array.isArray(data.reviews) ? data.reviews : [];

    return {
        name: data.name || 'Terverifikasi Lokal',
        wa: data.wa || '',
        headline,
        subheadline,
        testimonials
    };
}

export async function getEnrichedData(): Promise<BusinessData[]> {
    const filePath = path.join(process.cwd(), 'enriched_results.json');
    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContents);
        return Promise.all(data.map((item: any) => sanitizeBusinessData(item)));
    } catch (error) {
        console.error('Error reading enriched_results.json:', error);
        return [];
    }
}

export async function getBusinessBySlug(slug: string): Promise<BusinessData | undefined> {
    const filePath = path.join(process.cwd(), 'enriched_results.json');
    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        const allData: any[] = JSON.parse(fileContents);
        const rawBusiness = allData.find(item => slugify(item.name) === slug);

        if (!rawBusiness || !rawBusiness.ai_branding) {
            return undefined;
        }

        return sanitizeBusinessData(rawBusiness);
    } catch (error) {
        console.error('Error in getBusinessBySlug:', error);
        return undefined;
    }
}

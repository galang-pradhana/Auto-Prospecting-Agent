import React from 'react';
import { Dna } from 'lucide-react';
import { getBrandDnaLeads, getUniqueCategories } from '@/lib/actions/brand-dna';
import { BrandDnaClient } from '@/components/BrandDnaClient';

export const dynamic = 'force-dynamic';

export default async function BrandDnaPage() {
    const [leads, categories] = await Promise.all([
        getBrandDnaLeads({}),
        getUniqueCategories()
    ]);

    return (
        <div className="space-y-8 pb-32">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter text-white uppercase flex items-center gap-3">
                        <Dna className="text-accent-gold" size={32} /> BrandDNA Diver
                    </h1>
                    <p className="text-white/40 italic font-medium">Gali brand DNA klien secara mendalam untuk keperluan blueprint website yang presisi.</p>
                </div>
            </header>

            <BrandDnaClient 
                initialLeads={leads} 
                categories={categories} 
            />
        </div>
    );
}

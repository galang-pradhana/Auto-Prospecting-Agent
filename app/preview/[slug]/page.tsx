import { notFound } from 'next/navigation';
import { getBusinessBySlug } from '@/lib/data';
import PreviewContent from '@/components/PreviewContent';

export default async function PreviewPage({ params }: { params: { slug: string } }) {
    const business = await getBusinessBySlug(params.slug);

    if (!business) {
        notFound();
    }

    return <PreviewContent business={business} />;
}

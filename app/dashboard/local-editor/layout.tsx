import { redirect } from 'next/navigation';
import { isOwner } from '@/lib/auth';

/**
 * Server-side layout guard for /dashboard/local-editor
 * Hanya owner (OWNER_EMAIL di .env) yang bisa masuk.
 * Semua user lain otomatis di-redirect ke /dashboard
 */
export default async function LocalEditorLayout({ children }: { children: React.ReactNode }) {
    const owner = await isOwner();

    if (!owner) {
        redirect('/dashboard');
    }

    return <>{children}</>;
}

import { getMonitoringLeads, getMonitoringStats } from '@/lib/actions/monitoring';
import MonitoringClient from './MonitoringClient';

export default async function MonitoringPage() {
    const rawLeads = await getMonitoringLeads();
    const stats = await getMonitoringStats();

    const leads = rawLeads.map((l: any) => ({
        ...l,
        pendingDraft: l.followupQueue?.[0] || null
    }));

    return <MonitoringClient initialLeads={leads as any} stats={stats} />;
}

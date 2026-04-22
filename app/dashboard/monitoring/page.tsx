import { getMonitoringLeads, getMonitoringStats } from '@/lib/actions/monitoring';
import MonitoringClient from './MonitoringClient';

export default async function MonitoringPage() {
    const [leads, stats] = await Promise.all([
        getMonitoringLeads(),
        getMonitoringStats(),
    ]);

    return <MonitoringClient initialLeads={leads as any} stats={stats} />;
}

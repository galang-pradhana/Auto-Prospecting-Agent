export type JobType = 'SCRAPER' | 'ENRICH' | 'FORGE' | 'EDIT';
export type JobStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    progress: number; // 0 to 100
    message: string;
    data?: any;
    userId: string;
    createdAt: number;
    updatedAt: number;
}

// In-memory Global Job Registry for PM2 / Single-Node instance
declare global {
    var jobRegistry: Map<string, Job> | undefined;
}

const jobs = global.jobRegistry || new Map<string, Job>();

if (process.env.NODE_ENV !== 'production') {
    global.jobRegistry = jobs;
}

export const JobRegistry = {
    createJob: (id: string, type: JobType, userId: string, message: string = 'Initializing...'): Job => {
        const newJob: Job = {
            id,
            type,
            status: 'RUNNING',
            progress: 0,
            message,
            userId,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        jobs.set(id, newJob);
        return newJob;
    },

    updateJob: (id: string, updates: Partial<Pick<Job, 'progress' | 'message' | 'status' | 'data'>>) => {
        const job = jobs.get(id);
        if (job) {
            Object.assign(job, updates, { updatedAt: Date.now() });
            jobs.set(id, job);
        }
    },

    getJob: (id: string): Job | undefined => {
        return jobs.get(id);
    },

    getActiveJobsForUser: (userId: string): Job[] => {
        return Array.from(jobs.values()).filter(j => j.userId === userId && j.status === 'RUNNING');
    },
    
    getAllJobsForUser: (userId: string): Job[] => {
        return Array.from(jobs.values()).filter(j => j.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
    },

    clearOldJobs: () => {
        const ONE_HOUR = 60 * 60 * 1000;
        const now = Date.now();
        for (const [id, job] of jobs.entries()) {
            if (job.status !== 'RUNNING' && now - job.updatedAt > ONE_HOUR) {
                jobs.delete(id);
            }
        }
    }
};

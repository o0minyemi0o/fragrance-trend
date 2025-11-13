import { JobStatus } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('JobManager');

export class JobManager {
  private jobs: Map<string, JobStatus> = new Map();

  createJob(id: string, initialStage: string): JobStatus {
    const job: JobStatus = {
      id,
      status: 'pending',
      stage: initialStage,
      progress: 0,
      started_at: new Date(),
    };

    this.jobs.set(id, job);
    logger.info(`Job created: ${id} - ${initialStage}`);
    return job;
  }

  updateJob(id: string, updates: Partial<JobStatus>): void {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    Object.assign(job, updates);
    logger.info(`Job updated: ${id} - Status: ${job.status}, Progress: ${job.progress}%`);

    if (job.status === 'completed' || job.status === 'failed') {
      job.completed_at = new Date();
    }
  }

  getJob(id: string): JobStatus | undefined {
    return this.jobs.get(id);
  }

  setJobStage(id: string, stage: string, progress: number): void {
    this.updateJob(id, { stage, progress, status: 'running' });
  }

  setJobError(id: string, error: string): void {
    this.updateJob(id, { status: 'failed', error });
    logger.error(`Job failed: ${id} - ${error}`);
  }

  completeJob(id: string): void {
    this.updateJob(id, { status: 'completed', progress: 100 });
    logger.info(`Job completed: ${id}`);
  }

  getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  getActiveJobs(): JobStatus[] {
    return this.getAllJobs().filter(job => job.status === 'running' || job.status === 'pending');
  }

  cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.jobs.forEach((job, id) => {
      if (job.completed_at && now - job.completed_at.getTime() > maxAge) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => {
      this.jobs.delete(id);
      logger.debug(`Cleaned up old job: ${id}`);
    });

    if (toDelete.length > 0) {
      logger.info(`Cleaned up ${toDelete.length} old jobs`);
    }
  }
}

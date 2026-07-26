import fs from 'fs';
import os from 'os';
import path from 'path';

export type JobStatus = 'processing' | 'ready' | 'failed';

export interface DownloadJob {
  id: string;
  status: JobStatus;
  createdAt: number;
  url: string;
  formatId?: string;
  selectedFormat?: string;
  targetFormat?: string;
  videoUrl?: string;
  title?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  isCleanupDone?: boolean;
}

class JobManager {
  private jobs = new Map<string, DownloadJob>();
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

  constructor() {
    // Run TTL cleanup sweep every 2 minutes
    setInterval(() => this.sweepExpiredJobs(), 2 * 60 * 1000);
  }

  public createJob(id: string, payload: Partial<DownloadJob>): DownloadJob {
    const job: DownloadJob = {
      id,
      status: 'processing',
      createdAt: Date.now(),
      url: payload.url || '',
      formatId: payload.formatId,
      selectedFormat: payload.selectedFormat,
      targetFormat: payload.targetFormat,
      videoUrl: payload.videoUrl,
      title: payload.title
    };
    this.jobs.set(id, job);
    console.log(`[DOWNLOAD JOB] Created: ${id}`);
    return job;
  }

  public getJob(id: string): DownloadJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    // Check if expired
    if (Date.now() - job.createdAt > this.TTL_MS) {
      console.log(`[DOWNLOAD JOB] Job ${id} expired after TTL.`);
      this.cleanupJob(id);
      return undefined;
    }
    return job;
  }

  public updateJobStatus(id: string, update: Partial<DownloadJob>): DownloadJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    Object.assign(job, update);
    return job;
  }

  public cleanupJob(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;

    if (!job.isCleanupDone) {
      job.isCleanupDone = true;
      if (job.filePath && fs.existsSync(job.filePath)) {
        try {
          fs.unlinkSync(job.filePath);
          console.log(`[DOWNLOAD JOB] Cleanup completed for file: ${job.filePath}`);
        } catch (err: any) {
          console.warn(`[DOWNLOAD JOB Warning] File unlink error for ${id}:`, err?.message || err);
        }
      }
    }
    this.jobs.delete(id);
  }

  private sweepExpiredJobs(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.createdAt > this.TTL_MS) {
        console.log(`[DOWNLOAD JOB] Sweeping expired job: ${id}`);
        this.cleanupJob(id);
      }
    }
  }
}

export const jobManager = new JobManager();

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface JobPosting {
  id?: string;
  recruiter_uid: string;
  company_name: string;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  salary?: string;
  status?: 'Active' | 'Paused' | 'Closed';
  skills?: string[];
  min_score?: number;
  applicants?: number;
  shortlisted?: number;
  created_at?: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private memoryJobs: JobPosting[] = [];

  constructor(private readonly supabaseService: SupabaseService) {}

  async getJobs(recruiterUid?: string): Promise<JobPosting[]> {
    try {
      const client = this.supabaseService.getClient();
      let query = client.from('job_postings').select('*');

      if (recruiterUid) {
        query = query.eq('recruiter_uid', recruiterUid);
      } else {
        query = query.eq('status', 'Active');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        this.logger.warn(`Could not load jobs from Supabase (${error.message})`);
        return recruiterUid
          ? this.memoryJobs.filter((j) => j.recruiter_uid === recruiterUid)
          : this.memoryJobs;
      }

      return data || [];
    } catch {
      return recruiterUid
        ? this.memoryJobs.filter((j) => j.recruiter_uid === recruiterUid)
        : this.memoryJobs;
    }
  }

  async createJob(recruiterUid: string, job: Partial<JobPosting>): Promise<JobPosting> {
    const payload: JobPosting = {
      recruiter_uid: recruiterUid,
      company_name: job.company_name || 'Hiring Enterprise',
      title: job.title || 'Full Stack Engineer',
      department: job.department || 'Engineering',
      location: job.location || 'Remote',
      type: job.type || 'Full-Time',
      salary: job.salary || '₹20 LPA - ₹32 LPA',
      status: job.status || 'Active',
      skills: job.skills || ['React', 'TypeScript', 'Node.js'],
      min_score: job.min_score || 80,
      applicants: 0,
      shortlisted: 0,
      created_at: new Date().toISOString(),
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('job_postings')
        .insert(payload)
        .select()
        .single();

      if (error) {
        this.logger.warn(`Could not insert job to Supabase (${error.message})`);
        const local = { ...payload, id: `job-${Date.now()}` };
        this.memoryJobs.unshift(local);
        return local;
      }

      return data;
    } catch {
      const local = { ...payload, id: `job-${Date.now()}` };
      this.memoryJobs.unshift(local);
      return local;
    }
  }
}

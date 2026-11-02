import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface Application {
  id?: string;
  candidate_uid: string;
  job_id?: string;
  drive_id?: string;
  company_name: string;
  role_title: string;
  type: 'offcampus' | 'campus';
  status?: string;
  match_score?: number;
  location?: string;
  ctc?: string;
  applied_at?: string;
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private memoryApps = new Map<string, Application[]>();

  constructor(private readonly supabaseService: SupabaseService) {}

  async getApplications(candidateUid: string): Promise<Application[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('applications')
        .select('*')
        .eq('candidate_uid', candidateUid)
        .order('applied_at', { ascending: false });

      if (error) {
        this.logger.warn(`Could not load applications from Supabase (${error.message})`);
        return this.memoryApps.get(candidateUid) || [];
      }

      return data || [];
    } catch {
      return this.memoryApps.get(candidateUid) || [];
    }
  }

  async submitApplication(candidateUid: string, app: Partial<Application>): Promise<Application> {
    const payload: Application = {
      candidate_uid: candidateUid,
      job_id: app.job_id || null as any,
      drive_id: app.drive_id || null as any,
      company_name: app.company_name || 'Partner Company',
      role_title: app.role_title || 'Software Engineer',
      type: app.type || 'offcampus',
      status: 'Applied',
      match_score: app.match_score || 88,
      location: app.location || 'Remote',
      ctc: app.ctc || '₹18 LPA',
      applied_at: new Date().toISOString(),
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('applications')
        .insert(payload)
        .select()
        .single();

      if (error) {
        this.logger.warn(`Could not insert application into Supabase (${error.message})`);
        const local = { ...payload, id: `app-${Date.now()}` };
        const existing = this.memoryApps.get(candidateUid) || [];
        this.memoryApps.set(candidateUid, [local, ...existing]);
        return local;
      }

      return data;
    } catch {
      const local = { ...payload, id: `app-${Date.now()}` };
      const existing = this.memoryApps.get(candidateUid) || [];
      this.memoryApps.set(candidateUid, [local, ...existing]);
      return local;
    }
  }
}

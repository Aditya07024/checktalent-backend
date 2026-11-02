import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface CampusDrive {
  id?: string;
  tpo_uid: string;
  institution_name: string;
  company_name: string;
  role: string;
  package?: string;
  visit_date: string;
  cutoff_cgpa?: number;
  cutoff_proof_score?: number;
  status?: 'Scheduled' | 'Ongoing' | 'Completed';
  eligible_branches?: string[];
  batch_year?: string;
  created_at?: string;
}

@Injectable()
export class DrivesService {
  private readonly logger = new Logger(DrivesService.name);
  private memoryDrives: CampusDrive[] = [];

  constructor(private readonly supabaseService: SupabaseService) {}

  async getDrives(tpoUid?: string): Promise<CampusDrive[]> {
    try {
      const client = this.supabaseService.getClient();
      let query = client.from('campus_drives').select('*');

      if (tpoUid) {
        query = query.eq('tpo_uid', tpoUid);
      }

      const { data, error } = await query.order('visit_date', { ascending: true });
      if (error) {
        this.logger.warn(`Could not load drives from Supabase (${error.message})`);
        return tpoUid ? this.memoryDrives.filter((d) => d.tpo_uid === tpoUid) : this.memoryDrives;
      }

      return data || [];
    } catch {
      return tpoUid ? this.memoryDrives.filter((d) => d.tpo_uid === tpoUid) : this.memoryDrives;
    }
  }

  async scheduleDrive(tpoUid: string, drive: Partial<CampusDrive>): Promise<CampusDrive> {
    const payload: CampusDrive = {
      tpo_uid: tpoUid,
      institution_name: drive.institution_name || 'Engineering College',
      company_name: drive.company_name || 'Tech Enterprise',
      role: drive.role || 'Software Engineer',
      package: drive.package || '₹16 LPA',
      visit_date: drive.visit_date || new Date().toISOString().split('T')[0]!,
      cutoff_cgpa: drive.cutoff_cgpa || 7.5,
      cutoff_proof_score: drive.cutoff_proof_score || 80,
      status: drive.status || 'Scheduled',
      eligible_branches: drive.eligible_branches || ['CSE', 'IT', 'ECE'],
      batch_year: drive.batch_year || '2027',
      created_at: new Date().toISOString(),
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('campus_drives')
        .insert(payload)
        .select()
        .single();

      if (error) {
        this.logger.warn(`Could not insert drive into Supabase (${error.message})`);
        const local = { ...payload, id: `drive-${Date.now()}` };
        this.memoryDrives.push(local);
        return local;
      }

      return data;
    } catch {
      const local = { ...payload, id: `drive-${Date.now()}` };
      this.memoryDrives.push(local);
      return local;
    }
  }
}

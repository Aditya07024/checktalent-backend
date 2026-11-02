import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface CampusStudent {
  id?: string;
  tpo_uid: string;
  name: string;
  usn: string;
  department: string;
  cgpa?: string;
  proof_score?: number;
  repos_verified?: number;
  status?: string;
  skills?: string[];
  created_at?: string;
}

@Injectable()
export class CampusService {
  private readonly logger = new Logger(CampusService.name);
  private memoryStudents = new Map<string, CampusStudent[]>();

  constructor(private readonly supabaseService: SupabaseService) {}

  async getStudents(tpoUid: string): Promise<CampusStudent[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('campus_students')
        .select('*')
        .eq('tpo_uid', tpoUid)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.warn(`Could not load campus students from Supabase (${error.message})`);
        return this.memoryStudents.get(tpoUid) || [];
      }

      return data || [];
    } catch {
      return this.memoryStudents.get(tpoUid) || [];
    }
  }

  async addStudent(tpoUid: string, student: Partial<CampusStudent>): Promise<CampusStudent> {
    const payload: CampusStudent = {
      tpo_uid: tpoUid,
      name: student.name || 'Candidate',
      usn: (student.usn || '1MS22CS001').toUpperCase(),
      department: student.department || 'CSE',
      cgpa: student.cgpa || '8.5',
      proof_score: student.proof_score || 85,
      repos_verified: student.repos_verified || 2,
      status: student.status || 'Drive Ready',
      skills: student.skills || ['React', 'TypeScript', 'SQL'],
      created_at: new Date().toISOString(),
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('campus_students')
        .insert(payload)
        .select()
        .single();

      if (error) {
        this.logger.warn(`Could not insert student to Supabase (${error.message})`);
        const local = { ...payload, id: `std-${Date.now()}` };
        const existing = this.memoryStudents.get(tpoUid) || [];
        this.memoryStudents.set(tpoUid, [local, ...existing]);
        return local;
      }

      return data;
    } catch {
      const local = { ...payload, id: `std-${Date.now()}` };
      const existing = this.memoryStudents.get(tpoUid) || [];
      this.memoryStudents.set(tpoUid, [local, ...existing]);
      return local;
    }
  }
}

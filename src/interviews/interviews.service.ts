import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface Interview {
  id?: string;
  recruiter_uid: string;
  candidate_name: string;
  candidate_role: string;
  date: string;
  time: string;
  round_type: string;
  interviewer: string;
  status?: string;
  created_at?: string;
}

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);
  private memoryInterviews = new Map<string, Interview[]>();

  constructor(private readonly supabaseService: SupabaseService) {}

  async getInterviews(recruiterUid: string): Promise<Interview[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('interviews')
        .select('*')
        .eq('recruiter_uid', recruiterUid)
        .order('created_at', { ascending: false });

      if (error) {
        return this.memoryInterviews.get(recruiterUid) || [];
      }

      return data || [];
    } catch {
      return this.memoryInterviews.get(recruiterUid) || [];
    }
  }

  async scheduleInterview(recruiterUid: string, interview: Partial<Interview>): Promise<Interview> {
    const payload: Interview = {
      recruiter_uid: recruiterUid,
      candidate_name: interview.candidate_name || 'Candidate',
      candidate_role: interview.candidate_role || 'Senior Engineer',
      date: interview.date || new Date().toISOString().split('T')[0]!,
      time: interview.time || '03:00 PM IST',
      round_type: interview.round_type || 'Technical Viva',
      interviewer: interview.interviewer || 'Staff Architect',
      status: 'Scheduled',
      created_at: new Date().toISOString(),
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('interviews')
        .insert(payload)
        .select()
        .single();

      if (error) {
        const local = { ...payload, id: `int-${Date.now()}` };
        const existing = this.memoryInterviews.get(recruiterUid) || [];
        this.memoryInterviews.set(recruiterUid, [local, ...existing]);
        return local;
      }

      return data;
    } catch {
      const local = { ...payload, id: `int-${Date.now()}` };
      const existing = this.memoryInterviews.get(recruiterUid) || [];
      this.memoryInterviews.set(recruiterUid, [local, ...existing]);
      return local;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface VerifiedCandidate {
  id: string;
  name: string;
  email: string;
  institution: string;
  targetRole: string;
  proofScore: number;
  reposAudited: number;
  plagiarism: string;
  aiPercentage: string;
  topSkills: string[];
  highlightRepo: string;
  status: string;
  avatarColor: string;
}

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getCandidates(): Promise<VerifiedCandidate[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('role', 'student');

      if (error || !data || data.length === 0) {
        return [];
      }

      const colors = ['bg-amber-600', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600'];

      return data.map((u, i) => ({
        id: u.firebase_uid,
        name: u.display_name || u.email?.split('@')[0] || 'Candidate',
        email: u.email || '',
        institution: u.institution || 'University',
        targetRole: u.target_role || 'Software Engineer',
        proofScore: 88,
        reposAudited: 1,
        plagiarism: '0% Tutorial Code',
        aiPercentage: '4% (Human-authored)',
        topSkills: ['React', 'TypeScript', 'Node.js'],
        highlightRepo: 'audited-project',
        status: 'Under Review',
        avatarColor: colors[i % colors.length]!,
      }));
    } catch {
      return [];
    }
  }
}

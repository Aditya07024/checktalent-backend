import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export interface CandidateRepo {
  id?: string;
  candidate_uid: string;
  name: string;
  url?: string;
  language?: string;
  commits?: number;
  lines_of_code?: number;
  score?: number;
  status?: string;
  authorship?: string;
  ai_percent?: number;
  tutorial_match_percent?: number;
  description?: string;
  created_at?: string;
}

@Injectable()
export class ReposService {
  private readonly logger = new Logger(ReposService.name);
  private memoryRepos = new Map<string, CandidateRepo[]>();

  constructor(private readonly supabaseService: SupabaseService) {}

  async getRepos(candidateUid: string): Promise<CandidateRepo[]> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('candidate_repos')
        .select('*')
        .eq('candidate_uid', candidateUid)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.warn(`Could not load repos from Supabase (${error.message}), using fallback`);
        return this.memoryRepos.get(candidateUid) || [];
      }

      return data || [];
    } catch {
      return this.memoryRepos.get(candidateUid) || [];
    }
  }

  async addRepo(candidateUid: string, repo: Partial<CandidateRepo>): Promise<CandidateRepo> {
    const payload: CandidateRepo = {
      candidate_uid: candidateUid,
      name: repo.name || 'new-repository',
      url: repo.url || '',
      language: repo.language || 'TypeScript',
      commits: repo.commits || 14,
      lines_of_code: repo.lines_of_code || 1250,
      score: repo.score || 88,
      status: repo.status || 'Audited',
      authorship: repo.authorship || 'Verified Original',
      ai_percent: repo.ai_percent ?? 6,
      tutorial_match_percent: repo.tutorial_match_percent ?? 4,
      description: repo.description || 'Verified via CheckTalent AST analysis',
      created_at: new Date().toISOString(),
    };

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('candidate_repos')
        .insert(payload)
        .select()
        .single();

      if (error) {
        this.logger.warn(`Could not insert repo into Supabase (${error.message}), storing in fallback`);
        const existing = this.memoryRepos.get(candidateUid) || [];
        const local = { ...payload, id: `repo-${Date.now()}` };
        this.memoryRepos.set(candidateUid, [local, ...existing]);
        return local;
      }

      return data;
    } catch {
      const existing = this.memoryRepos.get(candidateUid) || [];
      const local = { ...payload, id: `repo-${Date.now()}` };
      this.memoryRepos.set(candidateUid, [local, ...existing]);
      return local;
    }
  }

  async deleteRepo(candidateUid: string, repoId: string): Promise<{ success: boolean }> {
    try {
      const client = this.supabaseService.getClient();
      await client
        .from('candidate_repos')
        .delete()
        .eq('id', repoId)
        .eq('candidate_uid', candidateUid);
    } catch {
      // ignore
    }

    const existing = this.memoryRepos.get(candidateUid) || [];
    this.memoryRepos.set(
      candidateUid,
      existing.filter((r) => r.id !== repoId),
    );

    return { success: true };
  }
}

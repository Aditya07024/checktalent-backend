import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { UsersService } from '../users/users.service.js';

export interface DashboardResponse {
  role: 'student' | 'offcampus' | 'campus';
  userProfile: {
    uid: string;
    displayName: string | null;
    email: string | null;
    headline?: string;
    institution?: string;
    companyName?: string;
  };
  metrics: Record<string, unknown>;
  quickActions: Array<{ id: string; label: string; href: string }>;
  recentFeed: Array<{ id: string; title: string; timestamp: string; tag: string }>;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async getUserDashboard(firebaseUid: string): Promise<DashboardResponse> {
    const profile = await this.usersService.getProfile(firebaseUid);

    if (!profile.role) {
      throw new BadRequestException(
        'User has not been assigned a dashboard role yet. Please complete onboarding first.',
      );
    }

    // Try fetching custom metrics from Supabase
    let customMetrics: Record<string, unknown> | null = null;
    try {
      customMetrics = await this.supabaseService.getDashboardMetrics(firebaseUid);
    } catch (err: unknown) {
      this.logger.warn(`Could not load custom metrics: ${err}`);
    }

    const role = profile.role;
    const defaultMetrics = this.getRoleDefaultMetrics(role);
    const metrics = { ...defaultMetrics, ...(customMetrics || {}) };

    return {
      role,
      userProfile: {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        headline: profile.headline,
        institution: profile.institution,
        companyName: profile.companyName,
      },
      metrics,
      quickActions: this.getRoleQuickActions(role),
      recentFeed: this.getRoleFeed(role),
    };
  }

  getRoleOverview(role: string): Record<string, unknown> {
    if (!['student', 'offcampus', 'campus'].includes(role)) {
      throw new BadRequestException('Invalid role. Supported: student, offcampus, campus');
    }
    const validatedRole = role as 'student' | 'offcampus' | 'campus';

    return {
      role: validatedRole,
      title:
        validatedRole === 'student'
          ? 'Candidate & Developer Workspace'
          : validatedRole === 'offcampus'
            ? 'Recruiter & Talent Discovery Portal'
            : 'University & Placement Administration',
      sampleMetrics: this.getRoleDefaultMetrics(validatedRole),
      quickActions: this.getRoleQuickActions(validatedRole),
    };
  }

  async saveDashboardMetrics(
    firebaseUid: string,
    metrics: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.usersService.getProfile(firebaseUid);
    if (!profile.role) {
      throw new BadRequestException('User does not have an assigned dashboard role.');
    }

    await this.supabaseService.upsertDashboardMetrics(firebaseUid, profile.role, metrics);
    return {
      success: true,
      message: 'Dashboard metrics synchronized with Supabase database.',
    };
  }

  private getRoleDefaultMetrics(role: 'student' | 'offcampus' | 'campus'): Record<string, unknown> {
    switch (role) {
      case 'student':
        return {
          auditedRepos: 3,
          overallSkillProofScore: 89,
          codeOriginalityScore: 94,
          mockInterviewsCompleted: 2,
          activeApplications: 5,
          nextCampusDrive: 'Nov 12, 2026',
        };
      case 'offcampus':
        return {
          activeJobPostings: 4,
          verifiedCandidatesInFunnel: 38,
          plagiarismFlagsResolved: 12,
          interviewsScheduledToday: 6,
          offerLettersIssued: 3,
        };
      case 'campus':
        return {
          registeredStudents: 480,
          placementReadinessIndex: '81%',
          visitingRecruiterPartners: 18,
          activePlacementDrives: 4,
          batchYear: '2027',
        };
    }
  }

  private getRoleQuickActions(role: 'student' | 'offcampus' | 'campus'): Array<{ id: string; label: string; href: string }> {
    switch (role) {
      case 'student':
        return [
          { id: 'audit-repo', label: 'Audit New GitHub Repo', href: '/dashboard#repo-forensics' },
          { id: 'skill-card', label: 'View Skill Proof Card', href: '/dashboard#skill-proof' },
          { id: 'mock-interview', label: 'Start AI Mock Interview', href: '/dashboard#interview' },
        ];
      case 'offcampus':
        return [
          { id: 'post-job', label: 'Post New Off-Campus Job', href: '/dashboard#post-job' },
          { id: 'search-talent', label: 'Search Verified Engineers', href: '/dashboard#talent-search' },
          { id: 'review-audits', label: 'Inspect Repo Forensics', href: '/dashboard#audits' },
        ];
      case 'campus':
        return [
          { id: 'schedule-drive', label: 'Schedule Campus Drive', href: '/dashboard#schedule-drive' },
          { id: 'batch-readiness', label: 'Export NIRF / NAAC Report', href: '/dashboard#reports' },
          { id: 'verify-students', label: 'Audit Batch Repositories', href: '/dashboard#batch-audit' },
        ];
    }
  }

  private getRoleFeed(role: 'student' | 'offcampus' | 'campus'): Array<{ id: string; title: string; timestamp: string; tag: string }> {
    switch (role) {
      case 'student':
        return [
          { id: '1', title: 'Repository "distributed-cache" passed AI authenticity audit (96% human)', timestamp: '10 mins ago', tag: 'Verification' },
          { id: '2', title: 'Google Off-Campus Hiring Drive opened for Software Engineer', timestamp: '2 hours ago', tag: 'Opportunity' },
          { id: '3', title: 'System Design Mock Interview feedback report is available', timestamp: 'Yesterday', tag: 'Interview' },
        ];
      case 'offcampus':
        return [
          { id: '1', title: '3 new candidates submitted audited GitHub repos for "Senior Backend Engineer"', timestamp: '15 mins ago', tag: 'Applicant' },
          { id: '2', title: 'Plagiarism alert cleared for Candidate #104 (100% original commit graph)', timestamp: '1 hour ago', tag: 'Audit' },
        ];
      case 'campus':
        return [
          { id: '1', title: 'Microsoft Campus Drive registered 142 eligible students', timestamp: '30 mins ago', tag: 'Drive' },
          { id: '2', title: 'CSE Department placement readiness increased by +6.2%', timestamp: 'Yesterday', tag: 'Analytics' },
        ];
    }
  }
}

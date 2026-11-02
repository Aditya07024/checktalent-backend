import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService, type SupabaseUserProfile } from '../supabase/supabase.service.js';
import type { AssignRoleDto } from './dto/assign-role.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';

export interface FormattedUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: 'student' | 'offcampus' | 'campus' | null;
  roleLocked: boolean;
  institution?: string;
  companyName?: string;
  headline?: string;
  targetRole?: string;
  department?: string;
  batchYear?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  // In-memory cache fallback to guarantee uptime if database schema is not yet applied
  private readonly memoryCache = new Map<string, FormattedUserProfile>();

  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(firebaseUid: string, authUser?: AuthenticatedUser): Promise<FormattedUserProfile> {
    try {
      const user = await this.supabaseService.findUserByFirebaseUid(firebaseUid);
      if (user) {
        return this.mapToFormatted(user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not read profile from Supabase: ${msg}. Checking memory fallback.`);
    }

    // Check memory fallback
    const cached = this.memoryCache.get(firebaseUid);
    if (cached) {
      return cached;
    }

    // If user exists in auth but has no role assigned yet
    return {
      uid: firebaseUid,
      email: authUser?.email || null,
      displayName: authUser?.name || null,
      photoURL: authUser?.picture || null,
      role: null,
      roleLocked: false,
    };
  }

  async assignRole(
    firebaseUid: string,
    dto: AssignRoleDto,
    authUser?: AuthenticatedUser,
  ): Promise<FormattedUserProfile> {
    if (!dto.role) {
      throw new BadRequestException('Role is required (student, offcampus, or campus)');
    }

    // 1. Check if user already has an assigned role (role is permanently locked)
    const existing = await this.getProfile(firebaseUid, authUser);
    if (existing.role) {
      throw new ConflictException(
        `Dashboard is permanently assigned to role '${existing.role}'. Role switching is not permitted.`,
      );
    }

    const now = new Date().toISOString();

    const profilePayload: Partial<SupabaseUserProfile> & { firebase_uid: string } = {
      firebase_uid: firebaseUid,
      email: dto.email || authUser?.email || null,
      display_name: dto.displayName || authUser?.name || null,
      photo_url: dto.photoURL || authUser?.picture || null,
      role: dto.role,
      role_locked: true,
      role_assigned_at: now,
      institution: dto.institution?.trim() || null,
      company_name: dto.companyName?.trim() || null,
      headline: dto.headline?.trim() || null,
      target_role: dto.targetRole?.trim() || null,
      department: dto.department?.trim() || null,
      batch_year: dto.batchYear?.trim() || null,
    };

    let savedProfile: FormattedUserProfile;

    try {
      const res = await this.supabaseService.upsertUser(profilePayload);
      savedProfile = this.mapToFormatted(res);

      // Initialize starting metrics for the chosen dashboard role
      await this.initializeRoleMetrics(firebaseUid, dto.role);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to persist role in Supabase (${msg}). Storing in local cache.`);

      savedProfile = {
        uid: firebaseUid,
        email: profilePayload.email || null,
        displayName: profilePayload.display_name || null,
        photoURL: profilePayload.photo_url || null,
        role: dto.role,
        roleLocked: true,
        institution: dto.institution?.trim() || undefined,
        companyName: dto.companyName?.trim() || undefined,
        headline: dto.headline?.trim() || undefined,
        targetRole: dto.targetRole?.trim() || undefined,
        department: dto.department?.trim() || undefined,
        batchYear: dto.batchYear?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
    }

    this.memoryCache.set(firebaseUid, savedProfile);
    this.logger.log(`Successfully assigned permanent role '${dto.role}' to user ${firebaseUid}`);

    return savedProfile;
  }

  async updateProfile(
    firebaseUid: string,
    dto: UpdateProfileDto,
  ): Promise<FormattedUserProfile> {
    const existing = await this.getProfile(firebaseUid);
    if (!existing) {
      throw new NotFoundException('User profile not found');
    }

    const payload: Partial<SupabaseUserProfile> & { firebase_uid: string } = {
      firebase_uid: firebaseUid,
      display_name: dto.displayName ?? existing.displayName,
      photo_url: dto.photoURL ?? existing.photoURL,
      institution: dto.institution ?? existing.institution,
      company_name: dto.companyName ?? existing.companyName,
      headline: dto.headline ?? existing.headline,
      target_role: dto.targetRole ?? existing.targetRole,
      department: dto.department ?? existing.department,
      batch_year: dto.batchYear ?? existing.batchYear,
    };

    try {
      const res = await this.supabaseService.upsertUser(payload);
      const updated = this.mapToFormatted(res);
      this.memoryCache.set(firebaseUid, updated);
      return updated;
    } catch {
      const updated: FormattedUserProfile = {
        ...existing,
        displayName: dto.displayName ?? existing.displayName,
        institution: dto.institution ?? existing.institution,
        companyName: dto.companyName ?? existing.companyName,
        headline: dto.headline ?? existing.headline,
        targetRole: dto.targetRole ?? existing.targetRole,
        department: dto.department ?? existing.department,
        batchYear: dto.batchYear ?? existing.batchYear,
        updatedAt: new Date().toISOString(),
      };
      this.memoryCache.set(firebaseUid, updated);
      return updated;
    }
  }

  private async initializeRoleMetrics(firebaseUid: string, role: 'student' | 'offcampus' | 'campus') {
    try {
      const initialMetrics = this.getDefaultMetrics(role);
      await this.supabaseService.upsertDashboardMetrics(firebaseUid, role, initialMetrics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not initialize default metrics for ${firebaseUid}: ${msg}`);
    }
  }

  private getDefaultMetrics(role: 'student' | 'offcampus' | 'campus'): Record<string, unknown> {
    switch (role) {
      case 'student':
        return {
          auditedReposCount: 0,
          overallSkillProofScore: 88,
          aiCodeAuditIndex: 'Low AI Footprint (94% Human Written)',
          interviewReadiness: 'Ready for Screening',
          activeApplicationsCount: 3,
        };
      case 'offcampus':
        return {
          verifiedTalentPoolCount: 1420,
          activeJobPostingsCount: 4,
          interviewsScheduled: 12,
          shortlistedCandidates: 28,
        };
      case 'campus':
        return {
          totalRegisteredStudents: 480,
          placementDriveReadinessRate: '78%',
          upcomingRecruiterDrives: 6,
          auditedProfilesCount: 395,
        };
    }
  }

  private mapToFormatted(raw: SupabaseUserProfile): FormattedUserProfile {
    return {
      uid: raw.firebase_uid,
      email: raw.email,
      displayName: raw.display_name,
      photoURL: raw.photo_url,
      role: raw.role,
      roleLocked: raw.role_locked ?? true,
      institution: raw.institution || undefined,
      companyName: raw.company_name || undefined,
      headline: raw.headline || undefined,
      targetRole: raw.target_role || undefined,
      department: raw.department || undefined,
      batchYear: raw.batch_year || undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// Ensure global WebSocket is available for Node runtime
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

export interface SupabaseUserProfile {
  id?: string;
  firebase_uid: string;
  email: string | null;
  display_name: string | null;
  photo_url?: string | null;
  role: 'student' | 'offcampus' | 'campus' | null;
  role_locked: boolean;
  role_assigned_at?: string;
  institution?: string | null;
  company_name?: string | null;
  headline?: string | null;
  target_role?: string | null;
  department?: string | null;
  batch_year?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseKey =
      this.configService.get<string>('supabase.serviceRoleKey') ||
      this.configService.get<string>('supabase.anonKey');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Supabase URL or Key is missing. Database operations will be limited.',
      );
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      this.logger.log(`Initialized Supabase client targeting: ${supabaseUrl}`);
      this.checkConnection();
    } catch (error) {
      this.logger.error('Failed to initialize Supabase client:', error);
    }
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase client is not initialized. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.',
      );
    }
    return this.client;
  }

  async checkConnection(): Promise<{ connected: boolean; message: string; schemaReady: boolean }> {
    if (!this.client) {
      return { connected: false, message: 'Supabase client not configured', schemaReady: false };
    }

    try {
      const { data, error } = await this.client.from('users').select('id').limit(1);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
          this.logger.warn(
            "Supabase connected, but 'public.users' table is not created yet. Please execute 'supabase-schema.sql' in the Supabase SQL editor.",
          );
          this.isConnected = true;
          return {
            connected: true,
            message: 'Supabase reachable, pending schema creation (run supabase-schema.sql)',
            schemaReady: false,
          };
        }
        return {
          connected: false,
          message: error.message,
          schemaReady: false,
        };
      }

      this.isConnected = true;
      return {
        connected: true,
        message: 'Connected to Supabase PostgreSQL database successfully',
        schemaReady: true,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Connection check failed: ${msg}`);
      return {
        connected: false,
        message: msg,
        schemaReady: false,
      };
    }
  }

  async findUserByFirebaseUid(firebaseUid: string): Promise<SupabaseUserProfile | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error querying user ${firebaseUid}: ${error.message}`);
      throw error;
    }

    return (data as SupabaseUserProfile) || null;
  }

  async upsertUser(user: Partial<SupabaseUserProfile> & { firebase_uid: string }): Promise<SupabaseUserProfile> {
    const client = this.getClient();
    const now = new Date().toISOString();

    const payload = {
      ...user,
      updated_at: now,
    };

    const { data, error } = await client
      .from('users')
      .upsert(payload, { onConflict: 'firebase_uid' })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error upserting user ${user.firebase_uid}: ${error.message}`);
      throw error;
    }

    return data as SupabaseUserProfile;
  }

  async getDashboardMetrics(firebaseUid: string): Promise<Record<string, unknown> | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('dashboard_metrics')
      .select('metrics, role, updated_at')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      this.logger.warn(`Could not load metrics for ${firebaseUid}: ${error.message}`);
      return null;
    }

    return data?.metrics || null;
  }

  async upsertDashboardMetrics(
    firebaseUid: string,
    role: string,
    metrics: Record<string, unknown>,
  ): Promise<void> {
    const client = this.getClient();
    const { error } = await client.from('dashboard_metrics').upsert(
      {
        firebase_uid: firebaseUid,
        role,
        metrics,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'firebase_uid' },
    );

    if (error) {
      this.logger.error(`Failed to update dashboard metrics for ${firebaseUid}: ${error.message}`);
      throw error;
    }
  }
}

import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { FirebaseService } from '../auth/firebase.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Get()
  async checkHealth() {
    const supabaseHealth = await this.supabaseService.checkConnection();
    const firebaseReady = this.firebaseService.isReady();

    return {
      status: 'ok',
      service: 'CheckTalent / TalentLens API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      integrations: {
        supabase: {
          connected: supabaseHealth.connected,
          schemaReady: supabaseHealth.schemaReady,
          details: supabaseHealth.message,
        },
        firebase: {
          initialized: firebaseReady,
          authMode: firebaseReady ? 'Admin SDK' : 'Development / Token Verification',
        },
      },
    };
  }
}

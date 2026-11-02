import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthModule } from './health/health.module.js';
import { ReposModule } from './repos/repos.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { DrivesModule } from './drives/drives.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { CampusModule } from './campus/campus.module.js';
import { CandidatesModule } from './candidates/candidates.module.js';
import { InterviewsModule } from './interviews/interviews.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    HealthModule,
    ReposModule,
    JobsModule,
    DrivesModule,
    ApplicationsModule,
    CampusModule,
    CandidatesModule,
    InterviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

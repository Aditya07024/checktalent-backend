import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DashboardService, type DashboardResponse } from './dashboard.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Protected: Get the active authenticated user's personalized dashboard
   */
  @Get()
  @UseGuards(FirebaseAuthGuard)
  async getUserDashboard(@CurrentUser() user: AuthenticatedUser): Promise<DashboardResponse> {
    return this.dashboardService.getUserDashboard(user.uid);
  }

  /**
   * Public: Get preview metrics for a specific dashboard role
   */
  @Get('overview/:role')
  getRoleOverview(@Param('role') role: string): Record<string, unknown> {
    return this.dashboardService.getRoleOverview(role);
  }

  /**
   * Protected: Update or sync custom metrics for user's dashboard
   */
  @Post('metrics')
  @UseGuards(FirebaseAuthGuard)
  async saveMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    return this.dashboardService.saveDashboardMetrics(user.uid, body);
  }
}

import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService, type Application } from './applications.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('applications')
@UseGuards(FirebaseAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  async getApplications(@CurrentUser() user: AuthenticatedUser): Promise<Application[]> {
    return this.applicationsService.getApplications(user.uid);
  }

  @Post()
  async submitApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<Application>,
  ): Promise<Application> {
    return this.applicationsService.submitApplication(user.uid, body);
  }
}

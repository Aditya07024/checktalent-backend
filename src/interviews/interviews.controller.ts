import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InterviewsService, type Interview } from './interviews.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('interviews')
@UseGuards(FirebaseAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  async getInterviews(@CurrentUser() user: AuthenticatedUser): Promise<Interview[]> {
    return this.interviewsService.getInterviews(user.uid);
  }

  @Post()
  async scheduleInterview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<Interview>,
  ): Promise<Interview> {
    return this.interviewsService.scheduleInterview(user.uid, body);
  }
}

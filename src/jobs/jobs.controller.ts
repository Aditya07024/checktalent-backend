import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobsService, type JobPosting } from './jobs.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Public or Authenticated: Browse active jobs or filter by recruiter
   */
  @Get()
  async getJobs(@Query('recruiterUid') recruiterUid?: string): Promise<JobPosting[]> {
    return this.jobsService.getJobs(recruiterUid);
  }

  /**
   * Protected: Post a new job
   */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  async createJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<JobPosting>,
  ): Promise<JobPosting> {
    return this.jobsService.createJob(user.uid, body);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReposService, type CandidateRepo } from './repos.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('repos')
@UseGuards(FirebaseAuthGuard)
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Get()
  async getRepos(@CurrentUser() user: AuthenticatedUser): Promise<CandidateRepo[]> {
    return this.reposService.getRepos(user.uid);
  }

  @Post()
  async addRepo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<CandidateRepo>,
  ): Promise<CandidateRepo> {
    return this.reposService.addRepo(user.uid, body);
  }

  @Delete(':id')
  async deleteRepo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.reposService.deleteRepo(user.uid, id);
  }
}

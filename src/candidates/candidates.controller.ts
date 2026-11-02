import { Controller, Get, UseGuards } from '@nestjs/common';
import { CandidatesService, type VerifiedCandidate } from './candidates.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';

@Controller('candidates')
@UseGuards(FirebaseAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  async getCandidates(): Promise<VerifiedCandidate[]> {
    return this.candidatesService.getCandidates();
  }
}

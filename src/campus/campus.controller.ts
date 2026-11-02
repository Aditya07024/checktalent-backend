import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CampusService, type CampusStudent } from './campus.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('campus')
@UseGuards(FirebaseAuthGuard)
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get('students')
  async getStudents(@CurrentUser() user: AuthenticatedUser): Promise<CampusStudent[]> {
    return this.campusService.getStudents(user.uid);
  }

  @Post('students')
  async addStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<CampusStudent>,
  ): Promise<CampusStudent> {
    return this.campusService.addStudent(user.uid, body);
  }
}

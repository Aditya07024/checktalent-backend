import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DrivesService, type CampusDrive } from './drives.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('drives')
export class DrivesController {
  constructor(private readonly drivesService: DrivesService) {}

  @Get()
  async getDrives(@Query('tpoUid') tpoUid?: string): Promise<CampusDrive[]> {
    return this.drivesService.getDrives(tpoUid);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async scheduleDrive(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<CampusDrive>,
  ): Promise<CampusDrive> {
    return this.drivesService.scheduleDrive(user.uid, body);
  }
}

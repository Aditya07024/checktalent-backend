import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService, type FormattedUserProfile } from './users.service.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<FormattedUserProfile> {
    return this.usersService.getProfile(user.uid, user);
  }

  @Post('assign-role')
  async assignRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AssignRoleDto,
  ): Promise<FormattedUserProfile> {
    return this.usersService.assignRole(user.uid, dto, user);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateProfileDto,
  ): Promise<FormattedUserProfile> {
    return this.usersService.updateProfile(user.uid, dto);
  }
}

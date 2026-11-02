import { Module } from '@nestjs/common';
import { DrivesController } from './drives.controller.js';
import { DrivesService } from './drives.service.js';

@Module({
  controllers: [DrivesController],
  providers: [DrivesService],
  exports: [DrivesService],
})
export class DrivesModule {}

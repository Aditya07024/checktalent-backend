import { Module } from '@nestjs/common';
import { CampusController } from './campus.controller.js';
import { CampusService } from './campus.service.js';

@Module({
  controllers: [CampusController],
  providers: [CampusService],
  exports: [CampusService],
})
export class CampusModule {}

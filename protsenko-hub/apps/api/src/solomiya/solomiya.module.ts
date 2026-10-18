import { Module } from '@nestjs/common';
import { SolomiyaController } from './solomiya.controller';
import { SolomiyaService } from './solomiya.service';

@Module({
  controllers: [SolomiyaController],
  providers: [SolomiyaService],
})
export class SolomiyaModule {}

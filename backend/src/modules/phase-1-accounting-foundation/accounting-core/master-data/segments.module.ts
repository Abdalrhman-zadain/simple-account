import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';

@Module({
    imports: [PrismaModule],
    controllers: [SegmentsController],
    providers: [SegmentsService],
    exports: [SegmentsService],
})
export class MasterDataModule { }

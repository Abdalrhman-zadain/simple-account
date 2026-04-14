import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { AccountSubtypesController } from './account-subtypes.controller';
import { AccountSubtypesService } from './account-subtypes.service';
import { JournalEntryTypesController } from './journal-entry-types.controller';
import { JournalEntryTypesService } from './journal-entry-types.service';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';

@Module({
    imports: [PrismaModule],
    controllers: [SegmentsController, AccountSubtypesController, JournalEntryTypesController],
    providers: [SegmentsService, AccountSubtypesService, JournalEntryTypesService],
    exports: [SegmentsService, AccountSubtypesService, JournalEntryTypesService],
})
export class MasterDataModule { }

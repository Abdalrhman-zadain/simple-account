import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { PostingService } from './posting.service';

@Module({
  imports: [PrismaModule, JournalEntriesModule],
  providers: [PostingService],
  exports: [PostingService],
})
export class PostingLogicModule {}

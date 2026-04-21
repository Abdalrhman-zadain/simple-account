import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { DebitNotesController } from './debit-notes.controller';
import { DebitNotesService } from './debit-notes.service';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [PrismaModule, SuppliersModule],
  controllers: [DebitNotesController],
  providers: [DebitNotesService],
  exports: [DebitNotesService],
})
export class DebitNotesModule {}

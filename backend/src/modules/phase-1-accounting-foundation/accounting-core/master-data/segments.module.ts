import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../common/prisma/prisma.module';
import { AccountSubtypesController } from './account-subtypes.controller';
import { AccountSubtypesService } from './account-subtypes.service';
import { JournalEntryTypesController } from './journal-entry-types.controller';
import { JournalEntryTypesService } from './journal-entry-types.service';
import { PaymentMethodTypesController } from './payment-method-types.controller';
import { PaymentMethodTypesService } from './payment-method-types.service';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { TaxTreatmentsController } from './tax-treatments.controller';
import { TaxTreatmentsService } from './tax-treatments.service';
import { TaxesController } from './taxes.controller';
import { TaxesService } from './taxes.service';

@Module({
    imports: [PrismaModule],
    controllers: [SegmentsController, AccountSubtypesController, JournalEntryTypesController, PaymentMethodTypesController, TaxesController, TaxTreatmentsController],
    providers: [SegmentsService, AccountSubtypesService, JournalEntryTypesService, PaymentMethodTypesService, TaxesService, TaxTreatmentsService],
    exports: [SegmentsService, AccountSubtypesService, JournalEntryTypesService, PaymentMethodTypesService, TaxesService, TaxTreatmentsService],
})
export class MasterDataModule { }

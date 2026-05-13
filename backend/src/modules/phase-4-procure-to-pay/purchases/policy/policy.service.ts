import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { UpdatePurchasePolicyDto } from './dto/update-purchase-policy.dto';

const DEFAULT_POLICY_ID = 'default';

@Injectable()
export class PurchasePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy() {
    const row = await this.ensurePolicy();
    return this.mapPolicy(row);
  }

  async updatePolicy(dto: UpdatePurchasePolicyDto) {
    const purchaseDiscountAccountId = await this.validatePurchaseDiscountAccountId(dto.purchaseDiscountAccountId);

    const updated = await this.prisma.purchasePolicy.upsert({
      where: { id: DEFAULT_POLICY_ID },
      update: { purchaseDiscountAccountId },
      create: {
        id: DEFAULT_POLICY_ID,
        purchaseDiscountAccountId,
      },
      include: this.policyInclude(),
    });

    return this.mapPolicy(updated);
  }

  async getPurchaseDiscountAccountOrThrow() {
    const row = await this.prisma.purchasePolicy.findUnique({
      where: { id: DEFAULT_POLICY_ID },
      include: this.policyInclude(),
    });

    if (
      !row?.purchaseDiscountAccountId ||
      !row.purchaseDiscountAccount?.isActive ||
      !row.purchaseDiscountAccount.isPosting ||
      !this.isEligibleDiscountAccount(row.purchaseDiscountAccount.type, row.purchaseDiscountAccount.subtype)
    ) {
      throw new BadRequestException(
        'An active purchase discount / purchase returns account must be configured in purchase policy before posting debit notes.',
      );
    }

    return {
      id: row.purchaseDiscountAccount.id,
      code: row.purchaseDiscountAccount.code,
      name: row.purchaseDiscountAccount.name,
      nameAr: row.purchaseDiscountAccount.nameAr,
    };
  }

  private async ensurePolicy() {
    return this.prisma.purchasePolicy.upsert({
      where: { id: DEFAULT_POLICY_ID },
      update: {},
      create: {
        id: DEFAULT_POLICY_ID,
      },
      include: this.policyInclude(),
    });
  }

  private async validatePurchaseDiscountAccountId(accountId: string | null | undefined) {
    const normalized = accountId?.trim() || null;
    if (!normalized) {
      return null;
    }

    const account = await this.prisma.account.findUnique({
      where: { id: normalized },
      select: {
        id: true,
        isActive: true,
        isPosting: true,
        type: true,
        subtype: true,
      },
    });

    if (
      !account ||
      !account.isActive ||
      !account.isPosting ||
      !this.isEligibleDiscountAccount(account.type, account.subtype)
    ) {
      throw new BadRequestException(
        'Purchase discount / purchase returns account must be an active posting expense or eligible asset account.',
      );
    }

    return normalized;
  }

  private isEligibleDiscountAccount(type: string, subtype: string | null) {
    if (type === 'EXPENSE') {
      return true;
    }
    return type === 'ASSET' && (subtype === 'Inventory' || subtype === 'FixedAsset');
  }

  private policyInclude() {
    return {
      purchaseDiscountAccount: {
        select: {
          id: true,
          code: true,
          name: true,
          nameAr: true,
          type: true,
          subtype: true,
          isActive: true,
          isPosting: true,
        },
      },
    };
  }

  private mapPolicy(row: {
    id: string;
    purchaseDiscountAccountId: string | null;
    purchaseDiscountAccount?: {
      id: string;
      code: string;
      name: string;
      nameAr: string | null;
    } | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      purchaseDiscountAccountId: row.purchaseDiscountAccountId,
      purchaseDiscountAccount: row.purchaseDiscountAccount ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

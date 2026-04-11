import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/index';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { AccountNotFoundException } from '../shared/accounting-errors';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) { }

  async generateNextCode(parentId: string | null): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      let prefix = '';
      if (parentId) {
        const parent = await tx.account.findUnique({
          where: { id: parentId },
          select: { code: true },
        });
        if (!parent) throw new AccountNotFoundException(parentId);
        prefix = parent.code;
      }

      // Find the last child under this parent
      const lastChild = await tx.account.findFirst({
        where: { parentAccountId: parentId },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      if (!lastChild) {
        // If no children, root starts at 1, nested starts at prefix + 01
        if (!parentId) return '1';
        return prefix + '01';
      }

      const lastCode = lastChild.code;
      const suffix = lastCode.substring(prefix.length);

      // Handle non-numeric suffixes gracefully, though mostly they should be numeric
      const numericSuffix = parseInt(suffix, 10);
      if (isNaN(numericSuffix)) {
        return lastCode + '_1'; // Fallback
      }

      const nextSuffix = (numericSuffix + 1).toString().padStart(suffix.length, '0');
      return prefix + nextSuffix;
    });
  }

  async create(dto: CreateAccountDto) {
    if (dto.parentAccountId) {
      await this.ensureAccountExists(dto.parentAccountId);
    }

    // 1. If code is provided, use it. If not, generate it.
    let finalCode = dto.code;
    if (!finalCode) {
      // Prioritize relational segments if present (Enterprise logic)
      const segments = [dto.segment1, dto.segment2, dto.segment3, dto.segment4, dto.segment5];
      if (segments.some(s => !!s)) {
        finalCode = segments.filter(s => !!s).join('-');
      } else {
        // Use the new hierarchical auto-code generation
        finalCode = await this.generateNextCode(dto.parentAccountId || null);
      }
    }

    // 2. Inherit Type if missing
    let finalType = dto.type;
    if (!finalType && dto.parentAccountId) {
      const parent = await this.prisma.account.findUnique({
        where: { id: dto.parentAccountId },
        select: { type: true },
      });
      if (parent) {
        finalType = parent.type;
      }
    }

    // Default fallback if still missing (root accounts or invalid parent)
    finalType = finalType || 'ASSET';

    try {
      return await this.prisma.account.create({
        data: {
          code: finalCode,
          name: dto.name,
          nameAr: dto.nameAr,
          description: dto.description,
          type: finalType as any,
          subtype: dto.subtype,
          isPosting: dto.isPosting ?? true,
          segment1: dto.segment1,
          segment2: dto.segment2,
          segment3: dto.segment3,
          segment4: dto.segment4,
          segment5: dto.segment5,
          // Relational Segments
          segment1ValueId: dto.segment1ValueId,
          segment2ValueId: dto.segment2ValueId,
          segment3ValueId: dto.segment3ValueId,
          segment4ValueId: dto.segment4ValueId,
          segment5ValueId: dto.segment5ValueId,
          currencyCode: dto.currencyCode || 'JOD',
          parentAccountId: dto.parentAccountId,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException(`Account code ${finalCode} already exists.`);
      }

      throw error;
    }
  }

  async list(query?: { type?: string; isActive?: string; isPosting?: string; search?: string }) {
    return this.prisma.account.findMany({
      where: {
        type: query?.type as never,
        isActive: query?.isActive ? query.isActive === 'true' : undefined,
        isPosting: query?.isPosting ? query.isPosting === 'true' : undefined,
        OR: query?.search
          ? [
            { code: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
            { nameAr: { contains: query.search, mode: 'insensitive' } },
          ]
          : undefined,
      },
      include: {
        segment1Value: true,
        segment2Value: true,
        segment3Value: true,
        segment4Value: true,
        segment5Value: true,
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  async hierarchy(query?: { type?: string; isActive?: string; isPosting?: string; search?: string }) {
    const accounts = await this.list(query);
    const byParent = new Map<string | null, typeof accounts>();

    for (const account of accounts) {
      const parentId = account.parentAccountId ?? null;
      const siblings = byParent.get(parentId) ?? [];
      siblings.push(account);
      byParent.set(parentId, siblings);
    }

    type AccountTreeNode = (typeof accounts)[number] & { children: AccountTreeNode[] };

    const buildTree = (parentId: string | null): AccountTreeNode[] =>
      (byParent.get(parentId) ?? []).map((account) => ({
        ...account,
        children: buildTree(account.id),
      }));

    return buildTree(null);
  }

  async getById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        segment1Value: true,
        segment2Value: true,
        segment3Value: true,
        segment4Value: true,
        segment5Value: true,
        parentAccount: true,
      }
    });

    if (!account) {
      throw new AccountNotFoundException(id);
    }

    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.ensureAccountExists(id);

    if (dto.parentAccountId) {
      if (dto.parentAccountId === id) {
        throw new ConflictException('An account cannot be its own parent.');
      }

      await this.ensureAccountExists(dto.parentAccountId);
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        type: dto.type,
        subtype: dto.subtype,
        isPosting: dto.isPosting,
        segment1: dto.segment1,
        segment2: dto.segment2,
        segment3: dto.segment3,
        segment4: dto.segment4,
        segment5: dto.segment5,
        segment1ValueId: dto.segment1ValueId,
        segment2ValueId: dto.segment2ValueId,
        segment3ValueId: dto.segment3ValueId,
        segment4ValueId: dto.segment4ValueId,
        segment5ValueId: dto.segment5ValueId,
        currencyCode: dto.currencyCode,
        parentAccountId: dto.parentAccountId,
      },
    });
  }

  async deactivate(id: string) {
    await this.ensureAccountExists(id);

    return this.prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    await this.ensureAccountExists(id);

    return this.prisma.account.update({
      where: { id },
      data: { isActive: true },
    });
  }

  private async ensureAccountExists(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });

    if (!account) {
      throw new AccountNotFoundException(id);
    }

    return account;
  }

  private isUniqueConstraint(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}

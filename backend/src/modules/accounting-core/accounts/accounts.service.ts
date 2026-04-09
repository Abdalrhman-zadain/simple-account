import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/index';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { AccountNotFoundException } from '../shared/accounting-errors';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountDto) {
    if (dto.parentAccountId) {
      await this.ensureAccountExists(dto.parentAccountId);
    }

    try {
      return await this.prisma.account.create({
        data: {
          code: dto.code,
          name: dto.name,
          type: dto.type,
          parentAccountId: dto.parentAccountId,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException(`Account code ${dto.code} already exists.`);
      }

      throw error;
    }
  }

  async list(query?: { type?: string; isActive?: string; search?: string }) {
    return this.prisma.account.findMany({
      where: {
        type: query?.type as never,
        isActive: query?.isActive ? query.isActive === 'true' : undefined,
        OR: query?.search
          ? [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  async hierarchy(query?: { type?: string; isActive?: string; search?: string }) {
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
    const account = await this.prisma.account.findUnique({ where: { id } });

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
        type: dto.type,
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

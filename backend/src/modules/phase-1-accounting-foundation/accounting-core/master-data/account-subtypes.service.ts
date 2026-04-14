import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class AccountSubtypesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.accountSubtype.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async create(dto: { name: string }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required.');

    try {
      return await this.prisma.accountSubtype.create({
        data: { name },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Account subtype already exists.');
      }
      throw e;
    }
  }

  async update(id: string, dto: { name?: string; isActive?: boolean }) {
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) throw new BadRequestException('Name cannot be empty.');

    try {
      return await this.prisma.accountSubtype.update({
        where: { id },
        data: {
          name: name ?? undefined,
          isActive: dto.isActive,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Account subtype already exists.');
      }
      throw e;
    }
  }

  deactivate(id: string) {
    return this.prisma.accountSubtype.update({
      where: { id },
      data: { isActive: false },
    });
  }
}


import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async save(user: User): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id || undefined,
        walletAddress: user.walletAddress,
        role: user.role,
        permissions: (user.permissions || "[]") as any,
        nonce: user.nonce,
      },
    });
    return this.mapToEntity(created);
  }

  async update(user: User): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        role: user.role,
        permissions: (user.permissions || "[]") as any,
        nonce: user.nonce,
      },
    });
    return this.mapToEntity(updated);
  }

  private mapToEntity(prismaUser: any): User {
    return new User({
      id: prismaUser.id,
      walletAddress: prismaUser.walletAddress,
      role: prismaUser.role,
      permissions: prismaUser.permissions,
      nonce: prismaUser.nonce,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    });
  }
}

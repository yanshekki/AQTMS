import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { verifyMessage } from 'viem';
import { Role } from './roles.enum';

export interface JwtPayload {
  sub: string;
  walletAddress: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ... other methods unchanged ...

  async validateUser(payload: JwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      userId: user.id, // alias for backward compatibility
      walletAddress: user.walletAddress,
      role: user.role,
      permissions: user.permissions,
    };
  }
}
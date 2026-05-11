import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { verifyMessage } from 'viem';
import { Role } from './roles.enum';
import { AuthenticatedUser } from '../types/authenticated-user.interface';

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

  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = `Sign this message to login to AQTMS: ${Date.now()}-${Math.random().toString(36).substring(2)}`;

    await this.prisma.user.upsert({
      where: { walletAddress },
      update: { nonce },
      create: {
        walletAddress,
        nonce,
        role: Role.VIEWER,
        permissions: "[]",
      },
    });

    return nonce;
  }

  async verifySignatureAndLogin(
    walletAddress: string,
    signature: string,
    message: string,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user || !user.nonce) {
      throw new UnauthorizedException('No nonce found. Please request a new nonce first.');
    }

    if (!message.includes(user.nonce)) {
      throw new UnauthorizedException('Invalid message or nonce mismatch.');
    }

    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid wallet signature.');
    }

    await this.prisma.user.update({
      where: { walletAddress },
      data: { nonce: null },
    });

    const payload: JwtPayload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      permissions: (user.permissions || "[]") as any as string[],
    };

    const accessToken = this.jwtService.sign(payload);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      permissions: (user.permissions || "[]") as any as string[],
    };

    return {
      accessToken,
      user: authenticatedUser,
    };
  }

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      permissions: (user.permissions || "[]") as any as string[],
    };
  }
}
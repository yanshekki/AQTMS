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

  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = `Sign this message to login to AQTMS: ${Date.now()}-${Math.random().toString(36).substring(2)}`;

    await this.prisma.user.upsert({
      where: { walletAddress },
      update: { nonce },
      create: {
        walletAddress,
        nonce,
        role: Role.VIEWER,
        permissions: [],
      },
    });

    return nonce;
  }

  async verifySignatureAndLogin(
    walletAddress: string,
    signature: string,
    message: string,
  ): Promise<{ accessToken: string; user: any }> {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user || !user.nonce) {
      throw new UnauthorizedException('No nonce found. Please request a new nonce first.');
    }

    // Verify the message matches the nonce
    if (!message.includes(user.nonce)) {
      throw new UnauthorizedException('Invalid message or nonce mismatch.');
    }

    // Verify EIP-191 signature using viem
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid wallet signature.');
    }

    // Clear nonce after successful login
    await this.prisma.user.update({
      where: { walletAddress },
      data: { nonce: null },
    });

    // Generate JWT
    const payload: JwtPayload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      permissions: user.permissions || [],
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${walletAddress} logged in successfully`);

    return {
      accessToken,
      user: {
        id: user.id,
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        permissions: user.permissions || [],
      },
    };
  }

  async validateUser(payload: JwtPayload): Promise<any> {
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
      permissions: user.permissions || [],
    };
  }
}
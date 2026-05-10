import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @ApiOperation({ summary: 'Generate nonce for wallet signature' })
  @ApiResponse({ status: 200, description: 'Nonce generated successfully' })
  async generateNonce(@Body('walletAddress') walletAddress: string) {
    if (!walletAddress) {
      return { error: 'walletAddress is required' };
    }
    const nonce = await this.authService.generateNonce(walletAddress);
    return { nonce, message: 'Sign this nonce with your wallet to login.' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with wallet signature (EIP-191)' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT' })
  async login(
    @Body('walletAddress') walletAddress: string,
    @Body('signature') signature: string,
    @Body('message') message: string,
  ) {
    if (!walletAddress || !signature || !message) {
      return { error: 'walletAddress, signature and message are required' };
    }

    return this.authService.verifySignatureAndLogin(walletAddress, signature, message);
  }
}
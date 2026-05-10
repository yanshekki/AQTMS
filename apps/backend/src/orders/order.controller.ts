import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { ExecutionService } from '../execution/execution.service';
import { IOrderRepository } from '../domain/repositories/order.repository.interface';
import { Inject } from '@nestjs/common';
import { Order } from '../domain/entities/order.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    private readonly executionService: ExecutionService,
    @Inject('IOrderRepository') private readonly orderRepository: IOrderRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and execute a new order (paper or real)' })
  @ApiResponse({ status: 201, description: 'Order created and executed successfully', type: Order })
  @ApiResponse({ status: 400, description: 'Invalid request or risk check failed' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: Request): Promise<any> {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return { success: false, message: 'User not authenticated' };
    }
    const result = await this.executionService.executeOrder({
      userId,
      exchangeAccountId: createOrderDto.exchangeAccountId,
      symbol: createOrderDto.symbol,
      side: createOrderDto.side,
      type: createOrderDto.type,
      quantity: createOrderDto.quantity,
      price: createOrderDto.price,
      stopLoss: createOrderDto.stopLoss,
      takeProfit: createOrderDto.takeProfit,
      isPaper: createOrderDto.isPaper,
    });

    if (result.success && result.order) {
      // Save to repository
      await this.orderRepository.save(result.order);
      // TODO: log to ExecutionLog via service (moved to ExecutionService for real impl)
    }

    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get orders for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async getOrders(@Query('limit') limit?: string, @Req() req: Request): Promise<Order[]> {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return [];
    }
    return this.orderRepository.findByUserId(userId, limit ? parseInt(limit) : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getOrder(@Param('id') id: string): Promise<Order | null> {
    return this.orderRepository.findById(id);
  }

  @Get('active/:exchangeAccountId')
  @ApiOperation({ summary: 'Get active orders for an exchange account' })
  @ApiParam({ name: 'exchangeAccountId', description: 'Exchange Account ID' })
  async getActiveOrders(@Param('exchangeAccountId') exchangeAccountId: string): Promise<Order[]> {
    return this.orderRepository.findActiveByExchangeAccount(exchangeAccountId);
  }
}
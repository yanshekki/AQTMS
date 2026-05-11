import { Injectable, Logger } from '@nestjs/common';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult, OrderStatusResult } from './exchange.adapter.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status.vo';
// Note: order.types was moved to domain/value-objects

// ... rest of file

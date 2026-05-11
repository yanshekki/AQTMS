import { Injectable, Logger } from '@nestjs/common';
import { IExchangeAdapter, PlaceOrderParams, PlaceOrderResult, OrderStatusResult } from './exchange.adapter.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status.vo';
// order.types is now at domain/value-objects/order.types.ts

// ... existing implementation

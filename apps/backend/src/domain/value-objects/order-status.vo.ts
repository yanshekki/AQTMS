export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  CANCELLED = 'CANCELLED',
  CANCELED = 'CANCELLED', // alias for American spelling compatibility
  REJECTED = 'REJECTED',
}

export type OrderStatusType = keyof typeof OrderStatus;

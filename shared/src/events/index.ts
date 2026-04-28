/**
 * Event Types Enums and Interfaces
 * Defines all event types that can be published in the system
 */

/**
 * Auth Service Events
 */
export enum AuthEvents {
  USER_REGISTERED = 'user.registered',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_ROLE_CHANGED = 'user.role_changed',
}

/**
 * Account Service Events
 */
export enum AccountEvents {
  PROFILE_UPDATED = 'profile.updated',
  ADDRESS_ADDED = 'address.added',
  MEMBERSHIP_TIER_CHANGED = 'membership.tier_changed',
}

/**
 * Catalog Service Events
 */
export enum CatalogEvents {
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  INVENTORY_RESERVED = 'inventory.reserved',
  INVENTORY_RESTORED = 'inventory.restored',
  REVIEW_SUBMITTED = 'review.submitted',
  PROMOTION_CREATED = 'promotion.created',
}

/**
 * Cart Service Events
 */
export enum CartEvents {
  CART_CHECKOUT = 'cart.checkout',
}

/**
 * Order Service Events
 */
export enum OrderEvents {
  ORDER_CREATED = 'order.created',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  RETURN_REQUESTED = 'return.requested',
  RETURN_APPROVED = 'return.approved',
  RETURN_COMPLETED = 'return.completed',
}

/**
 * Payment Service Events
 */
export enum PaymentEvents {
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_INITIATED = 'refund.initiated',
  REFUND_COMPLETED = 'refund.completed',
}

/**
 * Report Service Events (Consumer only)
 */
export enum ReportEvents {
  // Report service only consumes events from other services
}

/**
 * Notification Service Events (Consumer only)
 */
export enum NotificationEvents {
  // Notification service only consumes events from other services
}

/**
 * Base Event Data Interface
 */
export interface BaseEventData {
  id: string;
  timestamp: string;
  source: string;
  version: number;
  aggregateId: string;
  aggregateType: string;
}

/**
 * User Registered Event
 */
export interface UserRegisteredData extends BaseEventData {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SELLER' | 'CUSTOMER';
}

/**
 * User Login Event
 */
export interface UserLoginData extends BaseEventData {
  userId: string;
  email: string;
  loginTime: string;
}

/**
 * Product Created Event
 */
export interface ProductCreatedData extends BaseEventData {
  productId: string;
  name: string;
  sellerId: string;
  price: number;
  stock: number;
}

/**
 * Order Created Event
 */
export interface OrderCreatedData extends BaseEventData {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

/**
 * Order Confirmed Event
 */
export interface OrderConfirmedData extends BaseEventData {
  orderId: string;
  customerId: string;
  confirmationTime: string;
}

/**
 * Payment Success Event
 */
export interface PaymentSuccessData extends BaseEventData {
  paymentId: string;
  orderId: string;
  customerId: string;
  amount: number;
  gateway: string;
  transactionId: string;
}

/**
 * Payment Failed Event
 */
export interface PaymentFailedData extends BaseEventData {
  paymentId: string;
  orderId: string;
  customerId: string;
  amount: number;
  gateway: string;
  reason: string;
}

/**
 * Inventory Reserved Event
 */
export interface InventoryReservedData extends BaseEventData {
  orderId: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
}

/**
 * Return Requested Event
 */
export interface ReturnRequestedData extends BaseEventData {
  returnId: string;
  orderId: string;
  customerId: string;
  reason: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
}

/**
 * Return Completed Event
 */
export interface ReturnCompletedData extends BaseEventData {
  returnId: string;
  orderId: string;
  customerId: string;
  refundAmount: number;
}

/**
 * Order Cancelled Event
 */
export interface OrderCancelledData extends BaseEventData {
  orderId: string;
  customerId: string;
  reason: string;
  refundAmount?: number;
}

/**
 * All Event Data Types Union
 */
export type EventData =
  | UserRegisteredData
  | UserLoginData
  | ProductCreatedData
  | OrderCreatedData
  | OrderConfirmedData
  | PaymentSuccessData
  | PaymentFailedData
  | InventoryReservedData
  | ReturnRequestedData
  | ReturnCompletedData
  | OrderCancelledData;

/**
 * Saga Step Interface
 * Defines a step in a saga orchestration
 */
export interface SagaStep {
  name: string;
  service: string;
  action: string;
  onSuccess?: string; // Next event to trigger
  onFailure?: string; // Compensation event to trigger
}

/**
 * Saga Definition Interface
 * Defines the complete saga orchestration
 */
export interface SagaDefinition {
  id: string;
  name: string;
  startEvent: string;
  steps: SagaStep[];
  compensation: SagaStep[];
}

/**
 * Checkout Saga Definition
 * Orchestrates checkout process: Cart -> Order -> Catalog -> Payment -> Order Confirmation
 */
export const CHECKOUT_SAGA: SagaDefinition = {
  id: 'checkout-saga-v1',
  name: 'Checkout Saga',
  startEvent: CartEvents.CART_CHECKOUT,
  steps: [
    {
      name: 'Create Order',
      service: 'order-service',
      action: 'createOrder',
      onSuccess: OrderEvents.ORDER_CREATED,
      onFailure: 'order.creation.failed',
    },
    {
      name: 'Reserve Inventory',
      service: 'catalog-service',
      action: 'reserveInventory',
      onSuccess: CatalogEvents.INVENTORY_RESERVED,
      onFailure: 'inventory.reservation.failed',
    },
    {
      name: 'Initiate Payment',
      service: 'payment-service',
      action: 'initiatePayment',
      onSuccess: PaymentEvents.PAYMENT_INITIATED,
      onFailure: 'payment.initiation.failed',
    },
    {
      name: 'Confirm Payment',
      service: 'payment-service',
      action: 'confirmPayment',
      onSuccess: PaymentEvents.PAYMENT_SUCCESS,
      onFailure: PaymentEvents.PAYMENT_FAILED,
    },
    {
      name: 'Confirm Order',
      service: 'order-service',
      action: 'confirmOrder',
      onSuccess: OrderEvents.ORDER_CONFIRMED,
      onFailure: 'order.confirmation.failed',
    },
  ],
  compensation: [
    {
      name: 'Restore Inventory',
      service: 'catalog-service',
      action: 'restoreInventory',
    },
    {
      name: 'Refund Payment',
      service: 'payment-service',
      action: 'refundPayment',
    },
    {
      name: 'Cancel Order',
      service: 'order-service',
      action: 'cancelOrder',
    },
  ],
};

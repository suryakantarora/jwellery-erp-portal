export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WHATSAPP';
export type NotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'CANCELLED';
export type RecipientType = 'USER' | 'CUSTOMER' | 'SUPPLIER' | 'ROLE';

/** A queued or delivered message from the backend's notification outbox. */
export interface NotificationRecord {
  readonly id: string;
  readonly eventType: string;
  readonly channel: NotificationChannel;
  readonly recipientType: RecipientType;
  readonly recipientId: string | null;
  readonly recipientAddress: string | null;
  readonly subject: string | null;
  readonly body: string | null;
  readonly status: NotificationStatus;
  readonly branchId: string | null;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly attemptCount: number;
  readonly sentAt: string | null;
  readonly failureReason: string | null;
  readonly createdAt: string;
}

// ── Notifications API Client (Zod-guarded) ──

import { z } from 'zod';
import { safeGet, axiosInstance } from './axiosInstance';

const NotificationSchema = z.object({
  id: z.string(), type: z.string(), title: z.string(), message: z.string(),
  time: z.string(), read: z.boolean(), targetRoute: z.string().optional(),
});

const NotificationsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(NotificationSchema),
  timestamp: z.string(),
});

export const notificationsApi = {
  getNotifications: () => safeGet('/api/v1/notifications', NotificationsResponseSchema),

  async markAsRead(id: string) {
    const res = await axiosInstance.put(`/api/v1/notifications/${id}/read`);
    return z.object({ success: z.literal(true), data: NotificationSchema, timestamp: z.string() }).parse(res.data);
  },

  async markAllRead() {
    const res = await axiosInstance.put('/api/v1/notifications/read-all');
    return z.object({ success: z.literal(true), data: z.object({ allRead: z.boolean() }), timestamp: z.string() }).parse(res.data);
  },
};

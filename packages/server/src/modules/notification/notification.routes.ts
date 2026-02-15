import type { FastifyPluginAsync } from 'fastify';
import { Types } from 'mongoose';

import { NotificationModel } from '../../models/notification.model.js';
import { authenticate } from '../auth/auth.middleware.js';

const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

const normalizeNotification = (notification: {
  _id?: Types.ObjectId;
  userId: Types.ObjectId | string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: notification._id?.toString() ?? '',
  userId: typeof notification.userId === 'string' ? notification.userId : notification.userId.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  data: notification.data ?? null,
  isRead: notification.isRead,
  readAt: notification.readAt ?? null,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/notifications', { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { page?: string; limit?: string };
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId: request.user.id };

    const [total, notifications] = await Promise.all([
      NotificationModel.countDocuments(filter),
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      notifications: notifications.map((notification) => normalizeNotification(notification)),
    };
  });

  fastify.get('/api/notifications/unread-count', { preHandler: [authenticate] }, async (request) => {
    const unreadCount = await NotificationModel.countDocuments({
      userId: request.user.id,
      isRead: false,
    });

    return { unreadCount };
  });

  fastify.patch('/api/notifications/:id/read', { preHandler: [authenticate] }, async (request) => {
    const notificationId = (request.params as { id: string }).id;
    if (!Types.ObjectId.isValid(notificationId)) {
      throw createHttpError(400, 'Invalid notification id');
    }

    const notification = await NotificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        userId: request.user.id,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true },
    );

    if (!notification) {
      throw createHttpError(404, 'Notification not found');
    }

    return { notification: normalizeNotification(notification.toObject()) };
  });

  fastify.patch('/api/notifications/read-all', { preHandler: [authenticate] }, async (request) => {
    const now = new Date();

    const result = await NotificationModel.updateMany(
      {
        userId: request.user.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: now,
        },
      },
    );

    return {
      updatedCount: result.modifiedCount,
      readAt: now,
    };
  });
};

export default notificationRoutes;

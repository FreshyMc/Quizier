import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { GameSessionDto, NotificationItem } from '../types/app';

export const queryKeys = {
  categories: ['categories'] as const,
  mySubmissions: ['my-submissions'] as const,
  notifications: (page: number) => ['notifications', page] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  leaderboard: ['leaderboard'] as const,
  gameHistory: ['game-history'] as const,
};

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: () =>
      api.get<{ categories: Array<{ id: string; name: string; slug: string }> }>('/api/categories'),
  });

export const useMySubmissions = () =>
  useQuery({
    queryKey: queryKeys.mySubmissions,
    queryFn: () => api.get<{ submissions: unknown[] }>('/api/questions/my-submissions'),
  });

export const useNotifications = (page = 1) =>
  useQuery({
    queryKey: queryKeys.notifications(page),
    queryFn: () =>
      api.get<{
        notifications: NotificationItem[];
        pagination: { page: number; totalPages: number };
      }>(`/api/notifications?page=${page}`),
  });

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => api.get<{ unreadCount: number }>('/api/notifications/unread-count'),
  });

export const useLeaderboard = () =>
  useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: () => api.get<{ leaderboard: unknown[] }>('/api/leaderboard'),
  });

export const useGameHistory = () =>
  useQuery({
    queryKey: queryKeys.gameHistory,
    queryFn: () => api.get<{ games: GameSessionDto[] }>('/api/games/history'),
  });

export const useSubmitQuestionMutation = () =>
  useMutation({
    mutationFn: (payload: unknown) => api.post('/api/questions/submit', payload),
  });

export const useCreateGameMutation = () =>
  useMutation({
    mutationFn: (payload: unknown) =>
      api.post<{ roomCode: string; game: GameSessionDto }>('/api/games', payload),
  });

export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch<{ notification: NotificationItem }>(`/api/notifications/${notificationId}/read`),
    onSuccess: (data) => {
      const updated = data?.notification;
      if (updated?.id) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              query.queryKey[0] === 'notifications' &&
              typeof query.queryKey[1] === 'number' &&
              query.queryKey.length === 2,
          },
          (previous: unknown) => {
            if (!previous || typeof previous !== 'object') return previous;
            const maybe = previous as {
              notifications?: NotificationItem[];
              pagination?: { page: number; totalPages: number };
            };

            if (!Array.isArray(maybe.notifications)) return previous;

            return {
              ...maybe,
              notifications: maybe.notifications.map((item) =>
                item.id === updated.id ? { ...item, ...updated } : item,
              ),
            };
          },
        );
      }

      if (updated?.isRead) {
        queryClient.setQueryData(queryKeys.unreadCount, (previous: unknown) => {
          const maybe = previous as { unreadCount?: number } | undefined;
          const current = typeof maybe?.unreadCount === 'number' ? maybe.unreadCount : undefined;
          if (current === undefined) return previous;
          return { unreadCount: Math.max(0, current - 1) };
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.patch<{ updatedCount: number; readAt: string | Date }>('/api/notifications/read-all'),
    onSuccess: () => {
      const nowIso = new Date().toISOString();

      queryClient.setQueriesData(
        {
          predicate: (query) =>
            query.queryKey[0] === 'notifications' &&
            typeof query.queryKey[1] === 'number' &&
            query.queryKey.length === 2,
        },
        (previous: unknown) => {
          if (!previous || typeof previous !== 'object') return previous;
          const maybe = previous as {
            notifications?: NotificationItem[];
            pagination?: { page: number; totalPages: number };
          };
          if (!Array.isArray(maybe.notifications)) return previous;

          return {
            ...maybe,
            notifications: maybe.notifications.map((item) =>
              item.isRead ? item : { ...item, isRead: true, readAt: item.readAt ?? nowIso },
            ),
          };
        },
      );

      queryClient.setQueryData(queryKeys.unreadCount, { unreadCount: 0 });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

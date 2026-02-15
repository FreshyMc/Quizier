import { useMutation, useQuery } from '@tanstack/react-query';
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

export const useMarkNotificationReadMutation = () =>
  useMutation({
    mutationFn: (notificationId: string) => api.patch(`/api/notifications/${notificationId}/read`),
  });

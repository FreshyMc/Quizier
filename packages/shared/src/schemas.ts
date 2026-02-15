import { z } from 'zod';
import { Difficulty } from './enums.js';
import { NotificationType } from './enums.js';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.email(),
  username: z.string().min(3).max(24),
  password: z.string().min(8),
});

export const tokenPayloadSchema = z.object({
  id: z.string(),
  role: z.string(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().default(''),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(300).optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: 'At least one field must be provided',
  });

export const createQuestionSchema = z.object({
  text: z.string().trim().min(10).max(500),
  options: z.array(z.string().trim().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  categoryId: z.string().trim().min(1),
  difficulty: z.enum(Difficulty),
});

export const submitQuestionSchema = createQuestionSchema;

export const rejectSubmissionSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(NotificationType),
  title: z.string(),
  message: z.string(),
  data: z.unknown().nullable().optional(),
  isRead: z.boolean().optional(),
  readAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createGameSchema = z.object({
  maxPlayers: z.number().int().min(2).max(12).optional().default(4),
  roundsPerPlayer: z.number().int().min(1).max(20),
  timePerTurn: z.number().int().min(5).max(120).optional().default(30),
  categories: z.array(z.string().trim().min(1)).min(1),
});

export const joinGameSchema = z.object({
  roomCode: z.string().trim().length(6),
});

export const answerSchema = z.object({
  roomCode: z.string().trim().length(6),
  option: z.number().int().min(0).max(3),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitQuestionInput = z.infer<typeof submitQuestionSchema>;
export type RejectSubmissionInput = z.infer<typeof rejectSubmissionSchema>;
export type NotificationPayload = z.infer<typeof notificationSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;

import { z } from 'zod';
import { Difficulty } from './enums.js';

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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitQuestionInput = z.infer<typeof submitQuestionSchema>;
export type RejectSubmissionInput = z.infer<typeof rejectSubmissionSchema>;

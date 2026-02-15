import { z } from 'zod';

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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

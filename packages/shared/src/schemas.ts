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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;

import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { UserRole } from '@quizier/shared';

import { env } from '../../config/env.js';
import { UserModel } from '../../models/user.model.js';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

type AuthTokenPayload = {
  id: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

const getCookieOptions = () => ({
  path: '/',
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
});

const issueTokens = (
  fastify: FastifyInstance,
  payload: Omit<AuthTokenPayload, 'type'>,
): AuthTokens => {
  const accessToken = fastify.jwt.sign(
    { ...payload, type: 'access' },
    {
      expiresIn: ACCESS_TOKEN_TTL,
    },
  );

  const refreshToken = fastify.jwt.sign(
    { ...payload, type: 'refresh' },
    {
      expiresIn: REFRESH_TOKEN_TTL,
      key: env.jwtRefreshSecret,
    },
  );

  return { accessToken, refreshToken };
};

const setAuthCookies = (reply: FastifyReply, tokens: AuthTokens) => {
  const cookieOptions = getCookieOptions();

  reply
    .setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, cookieOptions)
    .setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, cookieOptions);
};

export const clearAuthCookies = (reply: FastifyReply) => {
  reply
    .clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' })
    .clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
};

const hashPasswordWithSalt = async (password: string) => {
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = await argon2.hash(`${password}${passwordSalt}`, {
    type: argon2.argon2id,
  });

  return { passwordHash, passwordSalt };
};

const verifyPasswordWithSalt = async (
  password: string,
  passwordHash: string,
  passwordSalt: string,
) => {
  return argon2.verify(passwordHash, `${password}${passwordSalt}`);
};

export const register = async (
  fastify: FastifyInstance,
  input: RegisterInput,
  reply: FastifyReply,
) => {
  const existingUser = await UserModel.findOne({
    $or: [{ email: input.email.toLowerCase() }, { username: input.username }],
  }).lean();

  if (existingUser) {
    throw createHttpError(409, 'Email or username is already in use');
  }

  const { passwordHash, passwordSalt } = await hashPasswordWithSalt(input.password);
  const user = await UserModel.create({
    email: input.email.toLowerCase(),
    username: input.username,
    passwordHash,
    passwordSalt,
    role: UserRole.PLAYER,
  });

  const tokens = issueTokens(fastify, {
    id: user._id.toString(),
    role: user.role,
  });

  setAuthCookies(reply, tokens);

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
};

export const login = async (fastify: FastifyInstance, input: LoginInput, reply: FastifyReply) => {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() });

  if (!user) {
    throw createHttpError(401, 'Invalid email or password');
  }

  const isPasswordValid = await verifyPasswordWithSalt(
    input.password,
    user.passwordHash,
    user.passwordSalt,
  );
  if (!isPasswordValid) {
    throw createHttpError(401, 'Invalid email or password');
  }

  const tokens = issueTokens(fastify, {
    id: user._id.toString(),
    role: user.role,
  });

  setAuthCookies(reply, tokens);

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
};

export const refresh = async (
  fastify: FastifyInstance,
  refreshToken: string | undefined,
  reply: FastifyReply,
) => {
  if (!refreshToken) {
    throw createHttpError(401, 'Missing refresh token');
  }

  let payload: AuthTokenPayload;
  try {
    payload = fastify.jwt.verify<AuthTokenPayload>(refreshToken, {
      key: env.jwtRefreshSecret,
    });
  } catch {
    throw createHttpError(401, 'Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw createHttpError(401, 'Invalid refresh token');
  }

  const user = await UserModel.findById(payload.id).lean();
  if (!user) {
    throw createHttpError(401, 'User not found');
  }

  const tokens = issueTokens(fastify, {
    id: user._id.toString(),
    role: user.role,
  });

  setAuthCookies(reply, tokens);

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
};

export const logout = (reply: FastifyReply) => {
  clearAuthCookies(reply);

  return {
    success: true,
  };
};

export const me = async (fastify: FastifyInstance, userId: string) => {
  const user = await UserModel.findById(userId).lean();

  if (!user) {
    throw createHttpError(401, 'User not found');
  }

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
};

export const authCookieNames = {
  access: ACCESS_TOKEN_COOKIE,
  refresh: REFRESH_TOKEN_COOKIE,
};

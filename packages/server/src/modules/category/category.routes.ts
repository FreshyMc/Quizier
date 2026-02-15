import type { FastifyPluginAsync } from 'fastify';
import { Types } from 'mongoose';
import { UserRole, createCategorySchema, updateCategorySchema } from '@quizier/shared';

import { CategoryModel } from '../../models/category.model.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';

const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

const asStringId = (value: Types.ObjectId | string | undefined | null): string => {
  if (value == null) {
    return '';
  }

  return typeof value === 'string' ? value : value.toString();
};

const normalizeCategory = (category: {
  _id?: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  deletedAt?: Date | null;
  createdBy: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: asStringId(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description,
  isActive: category.isActive,
  deletedAt: category.deletedAt ?? null,
  createdBy: asStringId(category.createdBy),
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/admin/categories',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const parsed = createCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        throw createHttpError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
      }

      try {
        const category = await CategoryModel.create({
          name: parsed.data.name,
          description: parsed.data.description ?? '',
          createdBy: request.user.id,
        });

        return { category: normalizeCategory(category.toObject()) };
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: number }).code === 11000
        ) {
          throw createHttpError(409, 'Category slug already exists');
        }

        throw error;
      }
    },
  );

  fastify.get(
    '/api/admin/categories',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async () => {
      const categories = await CategoryModel.find({ isActive: true }).sort({ name: 1 }).lean();
      return { categories: categories.map(normalizeCategory) };
    },
  );

  fastify.get(
    '/api/admin/categories/archived',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async () => {
      const categories = await CategoryModel.find({ isActive: false })
        .sort({ deletedAt: -1 })
        .lean();
      return { categories: categories.map(normalizeCategory) };
    },
  );

  fastify.put(
    '/api/admin/categories/:id',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const categoryId = (request.params as { id: string }).id;
      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id');
      }

      const parsed = updateCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        throw createHttpError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
      }

      try {
        const category = await CategoryModel.findByIdAndUpdate(
          categoryId,
          {
            $set: {
              ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
              ...(parsed.data.description !== undefined
                ? { description: parsed.data.description }
                : {}),
            },
          },
          { new: true, runValidators: true },
        );

        if (!category) {
          throw createHttpError(404, 'Category not found');
        }

        return { category: normalizeCategory(category.toObject()) };
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: number }).code === 11000
        ) {
          throw createHttpError(409, 'Category slug already exists');
        }

        throw error;
      }
    },
  );

  fastify.delete(
    '/api/admin/categories/:id',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const categoryId = (request.params as { id: string }).id;
      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id');
      }

      const category = await CategoryModel.findByIdAndUpdate(
        categoryId,
        {
          $set: {
            isActive: false,
            deletedAt: new Date(),
          },
        },
        { new: true },
      );

      if (!category) {
        throw createHttpError(404, 'Category not found');
      }

      return { category: normalizeCategory(category.toObject()) };
    },
  );

  fastify.patch(
    '/api/admin/categories/:id/restore',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const categoryId = (request.params as { id: string }).id;
      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id');
      }

      const category = await CategoryModel.findByIdAndUpdate(
        categoryId,
        {
          $set: {
            isActive: true,
            deletedAt: null,
          },
        },
        { new: true },
      );

      if (!category) {
        throw createHttpError(404, 'Category not found');
      }

      return { category: normalizeCategory(category.toObject()) };
    },
  );

  fastify.get('/api/categories', async () => {
    const categories = await CategoryModel.find({ isActive: true }).sort({ name: 1 }).lean();
    return { categories: categories.map(normalizeCategory) };
  });
};

export default categoryRoutes;

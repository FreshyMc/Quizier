import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Types } from 'mongoose';
import {
  NotificationType,
  SubmissionStatus,
  UserRole,
  rejectSubmissionSchema,
  submitQuestionSchema,
} from '@quizier/shared';

import { CategoryModel } from '../../models/category.model.js';
import { NotificationModel } from '../../models/notification.model.js';
import { QuestionSubmissionModel } from '../../models/question-submission.model.js';
import { QuestionModel } from '../../models/question.model.js';
import { createHttpError, createHttpValidationError } from '../../utils/error.js';
import { formatValidationErrors } from '../../utils/validation.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';

const emitNotification = (fastify: FastifyInstance, userId: string, payload: unknown) => {
  fastify.io?.to(`user:${userId}`).emit('notification:new', payload);
};

const normalizeSubmission = (submission: {
  _id?: Types.ObjectId;
  questionId: Types.ObjectId | Record<string, unknown>;
  submittedBy: Types.ObjectId;
  status: SubmissionStatus;
  moderationHistory: Array<{
    action: SubmissionStatus;
    moderatorId: Types.ObjectId;
    reason: string;
    timestamp: Date;
  }>;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: submission._id?.toString() ?? '',
  questionId:
    typeof submission.questionId === 'object' &&
    submission.questionId !== null &&
    '_id' in submission.questionId
      ? String((submission.questionId as { _id: unknown })._id)
      : String(submission.questionId),
  submittedBy: submission.submittedBy.toString(),
  status: submission.status,
  moderationHistory: submission.moderationHistory.map((entry) => ({
    action: entry.action,
    moderatorId: entry.moderatorId.toString(),
    reason: entry.reason,
    timestamp: entry.timestamp,
  })),
  version: submission.version,
  createdAt: submission.createdAt,
  updatedAt: submission.updatedAt,
  question:
    typeof submission.questionId === 'object' &&
    submission.questionId !== null &&
    'text' in submission.questionId
      ? submission.questionId
      : undefined,
});

const normalizeQuestion = (question: {
  _id?: Types.ObjectId;
  text: string;
  options: string[];
  correctIndex: number;
  categoryId: Types.ObjectId;
  difficulty: string;
  submittedBy: Types.ObjectId;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: question._id?.toString() ?? '',
  text: question.text,
  options: question.options,
  correctIndex: question.correctIndex,
  categoryId: question.categoryId.toString(),
  difficulty: question.difficulty,
  submittedBy: question.submittedBy.toString(),
  isActive: question.isActive,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
});

const questionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/api/admin/categories/:categoryId/questions',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const { categoryId } = request.params as { categoryId: string };
      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id');
      }

      const categoryExists = await CategoryModel.exists({ _id: categoryId });
      if (!categoryExists) {
        throw createHttpError(404, 'Category not found');
      }

      const query = request.query as { page?: string; limit?: string };
      const page = Math.max(1, Number(query.page ?? 1) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50) || 50));
      const skip = (page - 1) * limit;

      const [total, questions] = await Promise.all([
        QuestionModel.countDocuments({ categoryId, isActive: true }),
        QuestionModel.find({ categoryId, isActive: true })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        questions: questions.map((question) =>
          normalizeQuestion(
            question as {
              _id?: Types.ObjectId;
              text: string;
              options: string[];
              correctIndex: number;
              categoryId: Types.ObjectId;
              difficulty: string;
              submittedBy: Types.ObjectId;
              isActive: boolean;
              createdAt?: Date;
              updatedAt?: Date;
            },
          ),
        ),
      };
    },
  );

  fastify.delete(
    '/api/admin/categories/:categoryId/questions/:questionId',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const { categoryId, questionId } = request.params as {
        categoryId: string;
        questionId: string;
      };
      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id');
      }

      if (!Types.ObjectId.isValid(questionId)) {
        throw createHttpError(400, 'Invalid question id');
      }

      const question = await QuestionModel.findOneAndUpdate(
        { _id: questionId, categoryId, isActive: true },
        {
          $set: {
            isActive: false,
          },
        },
        { new: true },
      ).lean();

      if (!question) {
        throw createHttpError(404, 'Approved question not found');
      }

      return {
        question: normalizeQuestion(
          question as {
            _id?: Types.ObjectId;
            text: string;
            options: string[];
            correctIndex: number;
            categoryId: Types.ObjectId;
            difficulty: string;
            submittedBy: Types.ObjectId;
            isActive: boolean;
            createdAt?: Date;
            updatedAt?: Date;
          },
        ),
      };
    },
  );

  fastify.get(
    '/api/admin/categories/:categoryId/questions/archived',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const { categoryId } = request.params as { categoryId: string };
      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id');
      }

      const categoryExists = await CategoryModel.exists({ _id: categoryId });
      if (!categoryExists) {
        throw createHttpError(404, 'Category not found');
      }

      const query = request.query as { page?: string; limit?: string };
      const page = Math.max(1, Number(query.page ?? 1) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50) || 50));
      const skip = (page - 1) * limit;

      const [total, questions] = await Promise.all([
        QuestionModel.countDocuments({ categoryId, isActive: false }),
        QuestionModel.find({ categoryId, isActive: false })
          .sort({ updatedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        questions: questions.map((question) =>
          normalizeQuestion(
            question as {
              _id?: Types.ObjectId;
              text: string;
              options: string[];
              correctIndex: number;
              categoryId: Types.ObjectId;
              difficulty: string;
              submittedBy: Types.ObjectId;
              isActive: boolean;
              createdAt?: Date;
              updatedAt?: Date;
            },
          ),
        ),
      };
    },
  );

  fastify.patch(
    '/api/admin/categories/:categoryId/questions/:questionId/restore',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const { categoryId, questionId } = request.params as {
        categoryId: string;
        questionId: string;
      };

      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id');
      }

      if (!Types.ObjectId.isValid(questionId)) {
        throw createHttpError(400, 'Invalid question id');
      }

      const question = await QuestionModel.findOneAndUpdate(
        { _id: questionId, categoryId, isActive: false },
        {
          $set: {
            isActive: true,
          },
        },
        { new: true },
      ).lean();

      if (!question) {
        throw createHttpError(404, 'Deleted question not found');
      }

      return {
        question: normalizeQuestion(
          question as {
            _id?: Types.ObjectId;
            text: string;
            options: string[];
            correctIndex: number;
            categoryId: Types.ObjectId;
            difficulty: string;
            submittedBy: Types.ObjectId;
            isActive: boolean;
            createdAt?: Date;
            updatedAt?: Date;
          },
        ),
      };
    },
  );

  fastify.post('/api/questions/submit', { preHandler: [authenticate] }, async (request) => {
    const parsed = submitQuestionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createHttpValidationError(400, formatValidationErrors(parsed.error));
    }

    if (!Types.ObjectId.isValid(parsed.data.categoryId)) {
      throw createHttpError(400, 'Invalid category id');
    }

    const category = await CategoryModel.findOne({
      _id: parsed.data.categoryId,
      isActive: true,
    }).lean();

    if (!category) {
      throw createHttpError(404, 'Category not found or inactive');
    }

    const question = await QuestionModel.create({
      text: parsed.data.text,
      options: parsed.data.options,
      correctIndex: parsed.data.correctIndex,
      categoryId: parsed.data.categoryId,
      difficulty: parsed.data.difficulty,
      submittedBy: request.user.id,
      isActive: false,
    });

    const submission = await QuestionSubmissionModel.create({
      questionId: question._id,
      submittedBy: request.user.id,
      status: SubmissionStatus.PENDING,
      moderationHistory: [],
      version: 1,
    });

    return {
      question: {
        id: question._id.toString(),
        text: question.text,
        options: question.options,
        correctIndex: question.correctIndex,
        categoryId: question.categoryId.toString(),
        difficulty: question.difficulty,
        submittedBy: question.submittedBy.toString(),
        isActive: question.isActive,
      },
      submission: normalizeSubmission(submission.toObject()),
    };
  });

  fastify.get('/api/questions/my-submissions', { preHandler: [authenticate] }, async (request) => {
    const submissions = await QuestionSubmissionModel.find({
      submittedBy: request.user.id,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'questionId',
        select: 'text options correctIndex categoryId difficulty isActive createdAt updatedAt',
      })
      .lean();

    return {
      submissions: submissions.map((submission) => normalizeSubmission(submission)),
    };
  });

  fastify.get(
    '/api/admin/questions/pending',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const query = request.query as { page?: string; limit?: string };
      const page = Math.max(1, Number(query.page ?? 1) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
      const skip = (page - 1) * limit;

      const [total, submissions] = await Promise.all([
        QuestionSubmissionModel.countDocuments({ status: SubmissionStatus.PENDING }),
        QuestionSubmissionModel.find({ status: SubmissionStatus.PENDING })
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .populate({
            path: 'questionId',
            select: 'text options correctIndex categoryId difficulty isActive createdAt updatedAt',
          })
          .lean(),
      ]);

      return {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        submissions: submissions.map((submission) => normalizeSubmission(submission)),
      };
    },
  );

  fastify.patch(
    '/api/admin/questions/:submissionId/approve',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const { submissionId } = request.params as { submissionId: string };
      if (!Types.ObjectId.isValid(submissionId)) {
        throw createHttpError(400, 'Invalid submission id');
      }

      const submission = await QuestionSubmissionModel.findById(submissionId);
      if (!submission) {
        throw createHttpError(404, 'Submission not found');
      }

      if (submission.status !== SubmissionStatus.PENDING) {
        throw createHttpError(409, 'Submission has already been moderated');
      }

      await QuestionModel.findByIdAndUpdate(submission.questionId, {
        $set: {
          isActive: true,
        },
      });

      submission.status = SubmissionStatus.APPROVED;
      submission.version += 1;
      submission.moderationHistory.push({
        action: SubmissionStatus.APPROVED,
        moderatorId: new Types.ObjectId(request.user.id),
        reason: '',
        timestamp: new Date(),
      });
      await submission.save();

      const notification = await NotificationModel.create({
        userId: submission.submittedBy,
        type: NotificationType.SUBMISSION_APPROVED,
        title: 'Question approved',
        message: 'Your question submission has been approved and is now active.',
        data: {
          submissionId: submission._id.toString(),
          questionId: submission.questionId.toString(),
        },
      });

      const notificationPayload = {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      };

      emitNotification(fastify, submission.submittedBy.toString(), notificationPayload);

      return {
        submission: normalizeSubmission(submission.toObject()),
        notification: notificationPayload,
      };
    },
  );

  fastify.patch(
    '/api/admin/questions/:submissionId/reject',
    { preHandler: [authenticate, authorize([UserRole.ADMIN])] },
    async (request) => {
      const { submissionId } = request.params as { submissionId: string };
      if (!Types.ObjectId.isValid(submissionId)) {
        throw createHttpError(400, 'Invalid submission id');
      }

      const parsed = rejectSubmissionSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createHttpValidationError(400, formatValidationErrors(parsed.error));
      }

      const submission = await QuestionSubmissionModel.findById(submissionId);
      if (!submission) {
        throw createHttpError(404, 'Submission not found');
      }

      if (submission.status !== SubmissionStatus.PENDING) {
        throw createHttpError(409, 'Submission has already been moderated');
      }

      await QuestionModel.findByIdAndUpdate(submission.questionId, {
        $set: {
          isActive: false,
        },
      });

      submission.status = SubmissionStatus.REJECTED;
      submission.version += 1;
      submission.moderationHistory.push({
        action: SubmissionStatus.REJECTED,
        moderatorId: new Types.ObjectId(request.user.id),
        reason: parsed.data.reason,
        timestamp: new Date(),
      });
      await submission.save();

      const notification = await NotificationModel.create({
        userId: submission.submittedBy,
        type: NotificationType.SUBMISSION_REJECTED,
        title: 'Question rejected',
        message: parsed.data.reason,
        data: {
          submissionId: submission._id.toString(),
          questionId: submission.questionId.toString(),
        },
      });

      const notificationPayload = {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      };

      emitNotification(fastify, submission.submittedBy.toString(), notificationPayload);

      return {
        submission: normalizeSubmission(submission.toObject()),
        notification: notificationPayload,
      };
    },
  );
};

export default questionRoutes;

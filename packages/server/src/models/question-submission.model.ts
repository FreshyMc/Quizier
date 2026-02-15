import { SubmissionStatus } from './model-enums.js';
import { model, Schema, type InferSchemaType } from 'mongoose';

const moderationHistorySchema = new Schema(
  {
    action: {
      type: String,
      enum: Object.values(SubmissionStatus),
      required: true,
    },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '', trim: true },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const questionSubmissionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.PENDING,
      required: true,
    },
    moderationHistory: { type: [moderationHistorySchema], default: [] },
    version: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true,
  },
);

export type QuestionSubmission = InferSchemaType<typeof questionSubmissionSchema>;
export const QuestionSubmissionModel = model('QuestionSubmission', questionSubmissionSchema);

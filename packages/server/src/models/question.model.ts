import { Difficulty } from './model-enums.js';
import { model, Schema, type InferSchemaType } from 'mongoose';

const questionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length === 4,
        message: 'Question options must contain exactly 4 entries.',
      },
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    difficulty: {
      type: String,
      enum: Object.values(Difficulty),
      required: true,
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

questionSchema.index({ categoryId: 1, difficulty: 1, isActive: 1 });

export type Question = InferSchemaType<typeof questionSchema>;
export const QuestionModel = model('Question', questionSchema);

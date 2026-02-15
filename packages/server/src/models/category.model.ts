import { model, Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  },
);

categorySchema.index({ slug: 1 }, { unique: true });

categorySchema.pre(
  'validate',
  function setSlug(this: HydratedDocument<InferSchemaType<typeof categorySchema>>) {
    if (this.isModified('name') || !this.slug) {
      this.slug = slugify(this.name);
    }
  },
);

export type Category = InferSchemaType<typeof categorySchema>;
export const CategoryModel = model('Category', categorySchema);

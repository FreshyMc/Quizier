import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

import { env } from '../src/config/env.js';
import { UserModel } from '../src/models/user.model.js';
import { CategoryModel } from '../src/models/category.model.js';
import { QuestionModel } from '../src/models/question.model.js';
import { Difficulty, UserRole } from '../src/models/model-enums.js';

type ParsedQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
};

type ParsedCategory = {
  name: string;
  questions: ParsedQuestion[];
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const parseArgs = (argv: string[]) => {
  const args = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token || !token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args.set(key, next);
      i += 1;
      continue;
    }

    args.set(key, 'true');
  }

  return {
    file: args.get('file'),
    dryRun: args.get('dry-run') === 'true',
  };
};

const parseQuizMarkdown = (markdown: string): ParsedCategory[] => {
  const lines = markdown.split(/\r?\n/);

  const categories: ParsedCategory[] = [];
  let currentCategory: ParsedCategory | null = null;

  let currentQuestionText: string | null = null;
  let currentOptions: { text: string; checked: boolean }[] = [];

  const finalizeQuestion = (lineNumberForErrors: number) => {
    if (!currentCategory || !currentQuestionText) {
      return;
    }

    if (currentOptions.length !== 4) {
      throw new Error(
        `Invalid question at line ${lineNumberForErrors}: expected 4 options, got ${currentOptions.length} (${currentQuestionText})`,
      );
    }

    const checkedIndexes = currentOptions
      .map((opt, index) => ({ opt, index }))
      .filter(({ opt }) => opt.checked)
      .map(({ index }) => index);

    if (checkedIndexes.length !== 1) {
      throw new Error(
        `Invalid question at line ${lineNumberForErrors}: expected exactly 1 checked option, got ${checkedIndexes.length} (${currentQuestionText})`,
      );
    }

    currentCategory.questions.push({
      text: currentQuestionText.trim(),
      options: currentOptions.map((o) => o.text.trim()),
      correctIndex: checkedIndexes[0]!,
    });

    currentQuestionText = null;
    currentOptions = [];
  };

  const finalizeCategory = (lineNumberForErrors: number) => {
    finalizeQuestion(lineNumberForErrors);

    if (!currentCategory) {
      return;
    }

    if (currentCategory.questions.length === 0) {
      throw new Error(
        `Category "${currentCategory.name}" has no questions (near line ${lineNumberForErrors})`,
      );
    }

    categories.push(currentCategory);
    currentCategory = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? '';
    const line = raw.trimEnd();

    const categoryMatch = /^##\s+Category:\s*(.+?)\s*$/.exec(line);
    if (categoryMatch) {
      finalizeCategory(i + 1);
      currentCategory = { name: categoryMatch[1]!.trim(), questions: [] };
      continue;
    }

    const questionMatch = /^###\s+\d+\.\s*(.+?)\s*$/.exec(line);
    if (questionMatch) {
      finalizeQuestion(i + 1);

      if (!currentCategory) {
        throw new Error(`Question found before any category at line ${i + 1}`);
      }

      currentQuestionText = questionMatch[1]!.trim();
      currentOptions = [];
      continue;
    }

    const optionMatch = /^-\s+\[(x|X|\s)\]\s*(.+?)\s*$/.exec(line);
    if (optionMatch) {
      if (!currentCategory || !currentQuestionText) {
        throw new Error(`Option found outside a question at line ${i + 1}`);
      }

      const checked = optionMatch[1]!.toLowerCase() === 'x';
      const optionText = optionMatch[2]!.trim();

      currentOptions.push({ text: optionText, checked });
      continue;
    }
  }

  finalizeCategory(lines.length);

  if (categories.length === 0) {
    throw new Error('No categories were found in the markdown file');
  }

  return categories;
};

const getSeedUserId = async (): Promise<string> => {
  if (env.adminEmail) {
    const byEmail = await UserModel.findOne({ email: env.adminEmail.toLowerCase() }).lean();
    if (byEmail?._id) {
      return byEmail._id.toString();
    }
  }

  const admin = await UserModel.findOne({ role: UserRole.ADMIN }).lean();
  if (admin?._id) {
    return admin._id.toString();
  }

  const anyUser = await UserModel.findOne({}).lean();
  if (anyUser?._id) {
    return anyUser._id.toString();
  }

  throw new Error(
    'No users exist in the database. Run the admin seed first (npm run seed:admin), then re-run this seed.',
  );
};

const seedExampleQuiz = async () => {
  const { file, dryRun } = parseArgs(process.argv.slice(2));

  const markdownPath = file
    ? resolve(process.cwd(), file)
    : resolve(process.cwd(), '..', '..', 'example-quiz.md');

  const markdown = readFileSync(markdownPath, 'utf8');
  const parsedCategories = parseQuizMarkdown(markdown);

  await mongoose.connect(env.mongodbUri);

  const seedUserId = await getSeedUserId();

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let questionsCreated = 0;
  let questionsUpdated = 0;

  for (const parsedCategory of parsedCategories) {
    const slug = slugify(parsedCategory.name);

    const existingCategory = await CategoryModel.findOne({ slug });

    if (dryRun) {
      if (existingCategory) {
        categoriesUpdated += 1;
      } else {
        categoriesCreated += 1;
      }

      // We can't reliably distinguish creates vs updates without writing,
      // so we just count them as "would create" when the category is new.
      if (!existingCategory) {
        questionsCreated += parsedCategory.questions.length;
      }

      continue;
    }

    const categoryDoc = (() => {
      if (existingCategory) {
        return CategoryModel.findByIdAndUpdate(
          existingCategory._id,
          {
            name: parsedCategory.name,
            description: '',
            isActive: true,
            deletedAt: null,
          },
          { new: true },
        );
      }

      return CategoryModel.create({
        name: parsedCategory.name,
        description: '',
        isActive: true,
        deletedAt: null,
        createdBy: seedUserId,
      });
    })();

    const resolvedCategoryDoc = await categoryDoc;

    if (!resolvedCategoryDoc?._id) {
      throw new Error(`Failed to upsert category: ${parsedCategory.name}`);
    }

    if (existingCategory) {
      categoriesUpdated += 1;
    } else {
      categoriesCreated += 1;
    }

    for (const parsedQuestion of parsedCategory.questions) {
      const existingQuestion = await QuestionModel.findOne({
        categoryId: resolvedCategoryDoc._id,
        text: parsedQuestion.text,
      });

      const payload = {
        text: parsedQuestion.text,
        options: parsedQuestion.options,
        correctIndex: parsedQuestion.correctIndex,
        categoryId: resolvedCategoryDoc._id,
        difficulty: Difficulty.EASY,
        submittedBy: seedUserId,
        isActive: true,
      };

      if (dryRun) {
        continue;
      }

      if (existingQuestion) {
        await QuestionModel.findByIdAndUpdate(existingQuestion._id, payload, { new: true });
        questionsUpdated += 1;
      } else {
        await QuestionModel.create(payload);
        questionsCreated += 1;
      }
    }
  }

  console.log('Seed complete');
  console.log({
    file: markdownPath,
    categoriesCreated,
    categoriesUpdated,
    questionsCreated,
    questionsUpdated,
    dryRun,
  });
};

seedExampleQuiz()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

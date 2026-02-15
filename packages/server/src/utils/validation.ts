import type { ZodError } from 'zod';

const formatPath = (path: ReadonlyArray<PropertyKey>) => {
  if (path.length === 0) {
    return 'body';
  }

  return path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${String(segment)}]`;
    }

    const key = String(segment);
    return result ? `${result}.${key}` : key;
  }, '');
};

export const formatValidationErrorMessage = (
  error: ZodError,
  fallback = 'Invalid request body',
) => {
  const issue = error.issues[0];
  if (!issue) {
    return fallback;
  }

  return `Invalid field "${formatPath(issue.path)}": ${issue.message}`;
};

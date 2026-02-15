type HttpErrorLike = {
  message?: string;
  statusCode?: number;
  validation?: unknown;
  code?: number | string;
  name?: string;
};

const isHttpStatusCode = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599;

const isKnownMongoDuplicateError = (error: HttpErrorLike) => error.code === 11000;

const isValidationLikeError = (error: HttpErrorLike) =>
  error.name === 'ValidationError' || error.name === 'CastError' || error.validation !== undefined;

export const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

export const normalizeHttpError = (
  error: unknown,
): { statusCode: number; message: string; error: Error } => {
  const fallbackError =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unexpected error');
  const candidate = fallbackError as HttpErrorLike;

  if (isKnownMongoDuplicateError(candidate)) {
    return {
      statusCode: 409,
      message: 'Resource already exists',
      error: fallbackError,
    };
  }

  if (isValidationLikeError(candidate)) {
    return {
      statusCode: 400,
      message: candidate.message ?? 'Validation failed',
      error: fallbackError,
    };
  }

  if (isHttpStatusCode(candidate.statusCode)) {
    return {
      statusCode: candidate.statusCode,
      message:
        candidate.message ??
        (candidate.statusCode >= 500 ? 'Internal server error' : 'Request failed'),
      error: fallbackError,
    };
  }

  return {
    statusCode: 500,
    message: 'Internal server error',
    error: fallbackError,
  };
};

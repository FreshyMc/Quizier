import { useCallback, useMemo, useState } from 'react';
import { ApiError } from '../lib/api';

type FormFieldErrors<TField extends string> = Partial<Record<TField, string>>;

const toFieldErrorMap = <TField extends string>(
  errors: Array<Record<string, string>>,
): FormFieldErrors<TField> => {
  return errors.reduce<FormFieldErrors<TField>>((result, item) => {
    for (const [field, message] of Object.entries(item)) {
      result[field as TField] = message;
    }

    return result;
  }, {});
};

export const useFormErrors = <TField extends string = string>() => {
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<TField>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const clearFieldError = useCallback((field: TField) => {
    setFieldErrors((previous) => {
      if (!(field in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const setFieldError = useCallback((field: TField, message: string) => {
    setFieldErrors((previous) => ({
      ...previous,
      [field]: message,
    }));
    setFormError(null);
  }, []);

  const handleSubmitError = useCallback((error: unknown, fallbackMessage: string) => {
    if (error instanceof ApiError) {
      if (Array.isArray(error.errors) && error.errors.length > 0) {
        setFieldErrors(toFieldErrorMap<TField>(error.errors));
        setFormError(null);
        return;
      }

      setFormError(error.message || fallbackMessage);
      return;
    }

    setFormError(error instanceof Error ? error.message : fallbackMessage);
  }, []);

  const hasFieldErrors = useMemo(() => Object.keys(fieldErrors).length > 0, [fieldErrors]);

  return {
    fieldErrors,
    formError,
    hasFieldErrors,
    clearErrors,
    clearFieldError,
    setFieldError,
    handleSubmitError,
  };
};

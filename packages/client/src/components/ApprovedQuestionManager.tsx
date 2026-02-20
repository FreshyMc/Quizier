import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LoadingButton } from './LoadingButton';

type Category = {
  id: string;
  name: string;
  slug?: string;
};

type ApprovedQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  categoryId: string;
  difficulty: string;
  submittedBy: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function ApprovedQuestionManager() {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories', 'active'],
    queryFn: () => api.get<{ categories: Category[] }>('/api/admin/categories'),
  });

  const categories = useMemo(() => categoriesQuery.data?.categories ?? [], [categoriesQuery.data]);

  useEffect(() => {
    if (categoryId) return;
    if (!categories.length) return;
    setCategoryId(categories[0]!.id);
  }, [categories, categoryId]);

  const questionsQuery = useQuery({
    queryKey: ['admin-category-questions', categoryId, 'active'],
    enabled: Boolean(categoryId),
    queryFn: () =>
      api.get<{ questions: ApprovedQuestion[] }>(
        `/api/admin/categories/${categoryId}/questions?limit=50&page=1`,
      ),
  });

  const archivedQuestionsQuery = useQuery({
    queryKey: ['admin-category-questions', categoryId, 'archived'],
    enabled: Boolean(categoryId),
    queryFn: () =>
      api.get<{ questions: ApprovedQuestion[] }>(
        `/api/admin/categories/${categoryId}/questions/archived?limit=50&page=1`,
      ),
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      if (!categoryId) throw new Error('Category is required');
      return api.delete<{ question: ApprovedQuestion }>(
        `/api/admin/categories/${categoryId}/questions/${questionId}`,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-category-questions', categoryId, 'active'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin-category-questions', categoryId, 'archived'],
        }),
      ]);
    },
  });

  const restoreQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      if (!categoryId) throw new Error('Category is required');
      return api.patch<{ question: ApprovedQuestion }>(
        `/api/admin/categories/${categoryId}/questions/${questionId}/restore`,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-category-questions', categoryId, 'active'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin-category-questions', categoryId, 'archived'],
        }),
      ]);
    },
  });

  const onDelete = async (questionId: string) => {
    setDeletingId(questionId);
    try {
      await deleteQuestion.mutateAsync(questionId);
    } finally {
      setDeletingId(null);
    }
  };

  const onRestore = async (questionId: string) => {
    setRestoringId(questionId);
    try {
      await restoreQuestion.mutateAsync(questionId);
    } finally {
      setRestoringId(null);
    }
  };

  const errorMessage =
    categoriesQuery.error?.message ??
    questionsQuery.error?.message ??
    archivedQuestionsQuery.error?.message ??
    deleteQuestion.error?.message ??
    restoreQuestion.error?.message;

  const questions = questionsQuery.data?.questions ?? [];
  const archivedQuestions = archivedQuestionsQuery.data?.questions ?? [];

  return (
    <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div>
        <h2 className="text-lg font-semibold">Question Management</h2>
        <p className="mt-1 text-sm text-slate-300">
          View, delete, and restore questions by category.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

      <div className="space-y-2">
        <label className="block text-sm text-slate-200">Category</label>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          disabled={categoriesQuery.isLoading || categories.length === 0}
        >
          {categories.length === 0 ? <option value="">No categories available</option> : null}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {categoriesQuery.isLoading ? (
        <p className="text-sm text-slate-300">Loading categories...</p>
      ) : null}

      {!categoriesQuery.isLoading && categories.length === 0 ? (
        <p className="text-sm text-slate-300">Create a category first.</p>
      ) : null}

      {categoryId && (questionsQuery.isLoading || archivedQuestionsQuery.isLoading) ? (
        <p className="text-sm text-slate-300">Loading questions...</p>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-200">Approved</h3>

        {categoryId && !questionsQuery.isLoading && questions.length === 0 ? (
          <p className="text-sm text-slate-300">No approved questions for this category.</p>
        ) : null}

        <ul className="space-y-2">
          {questions.map((question) => {
            const isDeleting = deletingId === question.id;
            const isBusy = Boolean(deletingId) || Boolean(restoringId);

            return (
              <li key={question.id} className="space-y-2 rounded bg-slate-800 p-3">
                <div className="space-y-1">
                  <p className="text-sm text-slate-200">{question.text}</p>
                  <p className="text-xs text-slate-400">Difficulty: {question.difficulty}</p>
                </div>

                <div className="flex items-center gap-2">
                  <LoadingButton
                    variant="danger"
                    onClick={() => void onDelete(question.id)}
                    disabled={isBusy}
                    isLoading={isDeleting}
                    loadingText="Deleting..."
                    spinnerClassName="h-3 w-3"
                  >
                    Delete
                  </LoadingButton>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-200">Deleted</h3>

        {categoryId && !archivedQuestionsQuery.isLoading && archivedQuestions.length === 0 ? (
          <p className="text-sm text-slate-300">No deleted questions for this category.</p>
        ) : null}

        <ul className="space-y-2">
          {archivedQuestions.map((question) => {
            const isRestoring = restoringId === question.id;
            const isBusy = Boolean(deletingId) || Boolean(restoringId);

            return (
              <li key={question.id} className="space-y-2 rounded bg-slate-800 p-3">
                <div className="space-y-1">
                  <p className="text-sm text-slate-200">{question.text}</p>
                  <p className="text-xs text-slate-400">Difficulty: {question.difficulty}</p>
                </div>

                <div className="flex items-center gap-2">
                  <LoadingButton
                    variant="primary"
                    onClick={() => void onRestore(question.id)}
                    disabled={isBusy}
                    isLoading={isRestoring}
                    loadingText="Restoring..."
                    spinnerClassName="h-3 w-3"
                  >
                    Restore
                  </LoadingButton>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

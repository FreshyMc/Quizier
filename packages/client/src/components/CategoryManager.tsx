import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LoadingButton } from './LoadingButton';

type Category = {
  id: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  deletedAt: string | null;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
};

export function CategoryManager() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['admin-categories', tab],
    queryFn: () =>
      api.get<{ categories: Category[] }>(
        tab === 'active' ? '/api/admin/categories' : '/api/admin/categories/archived',
      ),
  });

  const categories = useMemo(() => data?.categories ?? [], [data]);

  const createCategory = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      api.post<{ category: Category }>('/api/admin/categories', payload),
    onSuccess: async () => {
      setName('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: (payload: { id: string; name: string; description: string }) =>
      api.put<{ category: Category }>(`/api/admin/categories/${payload.id}`, {
        name: payload.name,
        description: payload.description,
      }),
    onSuccess: async () => {
      setEditingCategoryId(null);
      setEditName('');
      setEditDescription('');
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const archiveCategory = useMutation({
    mutationFn: (id: string) => api.delete<{ category: Category }>(`/api/admin/categories/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const restoreCategory = useMutation({
    mutationFn: (id: string) =>
      api.patch<{ category: Category }>(`/api/admin/categories/${id}/restore`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const mutationError =
    createCategory.error?.message ??
    updateCategory.error?.message ??
    archiveCategory.error?.message ??
    restoreCategory.error?.message;

  const isMutating =
    createCategory.isPending ||
    updateCategory.isPending ||
    archiveCategory.isPending ||
    restoreCategory.isPending;

  const onCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createCategory.mutateAsync({
      name: name.trim(),
      description: description.trim(),
    });
  };

  const onEditSubmit = (event: FormEvent<HTMLFormElement>, categoryId: string) => {
    event.preventDefault();
    void updateCategory.mutateAsync({
      id: categoryId,
      name: editName.trim(),
      description: editDescription.trim(),
    });
  };

  const removeCategory = async (id: string) => {
    await archiveCategory.mutateAsync(id);
    await refetch();
  };

  const restoreArchivedCategory = async (id: string) => {
    await restoreCategory.mutateAsync(id);
    await refetch();
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div>
        <h1 className="text-xl font-semibold">Category Management</h1>
        <p className="mt-1 text-sm text-slate-300">
          Create, edit, archive, and restore quiz categories.
        </p>
      </div>

      <form
        onSubmit={onCreateSubmit}
        className="space-y-2 rounded border border-slate-700 bg-slate-950 p-3"
      >
        <h2 className="text-sm font-medium text-slate-200">Create category</h2>
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            disabled={createCategory.isPending}
            required
            maxLength={80}
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            className="min-h-20 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            disabled={createCategory.isPending}
            maxLength={300}
          />
        </div>
        <LoadingButton
          type="submit"
          className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={name.trim().length === 0}
          isLoading={createCategory.isPending}
          loadingText="Creating..."
        >
          Create Category
        </LoadingButton>
      </form>

      <div className="flex gap-2">
        <button
          className={`rounded px-3 py-1 text-sm ${
            tab === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
          }`}
          onClick={() => setTab('active')}
        >
          Active
        </button>
        <button
          className={`rounded px-3 py-1 text-sm ${
            tab === 'archived' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
          }`}
          onClick={() => setTab('archived')}
        >
          Archived
        </button>
      </div>

      {mutationError ? <p className="text-sm text-red-300">{mutationError}</p> : null}

      {data === undefined ? <p className="text-sm text-slate-300">Loading categories...</p> : null}

      {data !== undefined && categories.length === 0 ? (
        <p className="text-sm text-slate-300">
          {tab === 'active' ? 'No active categories yet.' : 'No archived categories.'}
        </p>
      ) : null}

      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="space-y-3 rounded bg-slate-800 p-3">
            {editingCategoryId === category.id ? (
              <form onSubmit={(event) => onEditSubmit(event, category.id)} className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  maxLength={80}
                  required
                />
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="min-h-20 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  maxLength={300}
                />
                <div className="flex items-center gap-2">
                  <LoadingButton
                    type="submit"
                    disabled={editName.trim().length === 0}
                    className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    isLoading={updateCategory.isPending}
                    loadingText="Saving..."
                    spinnerClassName="h-3 w-3"
                  >
                    Save
                  </LoadingButton>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setEditName('');
                      setEditDescription('');
                    }}
                    className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-100 hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="font-medium text-white">{category.name}</p>
                  <p className="text-sm text-slate-300">
                    {category.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {tab === 'active' ? (
                    <>
                      <button
                        className="text-xs text-blue-300 hover:text-blue-200"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditName(category.name);
                          setEditDescription(category.description ?? '');
                        }}
                        disabled={isMutating}
                      >
                        Edit
                      </button>
                      <LoadingButton
                        className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void removeCategory(category.id)}
                        disabled={archiveCategory.isPending || updateCategory.isPending}
                        isLoading={archiveCategory.isPending}
                        loadingText="Archiving..."
                        spinnerClassName="h-3 w-3"
                      >
                        Archive
                      </LoadingButton>
                    </>
                  ) : (
                    <LoadingButton
                      className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void restoreArchivedCategory(category.id)}
                      disabled={restoreCategory.isPending || updateCategory.isPending}
                      isLoading={restoreCategory.isPending}
                      loadingText="Restoring..."
                      spinnerClassName="h-3 w-3"
                    >
                      Restore
                    </LoadingButton>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

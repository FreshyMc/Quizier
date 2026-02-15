import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function CategoryManager() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const { data, refetch } = useQuery({
    queryKey: ['admin-categories', tab],
    queryFn: () =>
      api.get<{ categories: Array<{ id: string; name: string; description: string }> }>(
        tab === 'active' ? '/api/admin/categories' : '/api/admin/categories/archived',
      ),
  });

  const removeCategory = async (id: string) => {
    await api.delete(`/api/admin/categories/${id}`);
    await refetch();
  };

  const restoreCategory = async (id: string) => {
    await api.patch(`/api/admin/categories/${id}/restore`);
    await refetch();
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="flex gap-2">
        <button className="rounded bg-slate-700 px-3 py-1 text-sm" onClick={() => setTab('active')}>
          Active
        </button>
        <button
          className="rounded bg-slate-700 px-3 py-1 text-sm"
          onClick={() => setTab('archived')}
        >
          Archived
        </button>
      </div>
      <ul className="space-y-2">
        {(data?.categories ?? []).map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between rounded bg-slate-800 p-2"
          >
            <span>{category.name}</span>
            {tab === 'active' ? (
              <button
                className="text-xs text-red-300"
                onClick={() => void removeCategory(category.id)}
              >
                Soft delete
              </button>
            ) : (
              <button
                className="text-xs text-emerald-300"
                onClick={() => void restoreCategory(category.id)}
              >
                Restore
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

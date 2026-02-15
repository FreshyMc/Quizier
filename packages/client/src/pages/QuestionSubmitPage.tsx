import { FormEvent, useState } from 'react';
import { useCategories, useSubmitQuestionMutation } from '../hooks/queries';

export function QuestionSubmitPage() {
  const { data } = useCategories();
  const submit = useSubmitQuestionMutation();

  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [categoryId, setCategoryId] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submit.mutateAsync({ text, options, correctIndex, difficulty, categoryId });
    setText('');
    setOptions(['', '', '', '']);
  };

  return (
    <form
      className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4"
      onSubmit={onSubmit}
    >
      <h1 className="text-lg font-semibold">Submit Question</h1>
      <textarea
        className="w-full rounded bg-slate-800 p-2 text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Question"
      />
      {options.map((option, index) => (
        <input
          key={index}
          className="w-full rounded bg-slate-800 p-2 text-sm"
          value={option}
          onChange={(e) =>
            setOptions((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))
          }
          placeholder={`Option ${index + 1}`}
        />
      ))}
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="number"
          min={0}
          max={3}
          value={correctIndex}
          onChange={(e) => setCorrectIndex(Number(e.target.value))}
          className="rounded bg-slate-800 p-2 text-sm"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
          className="rounded bg-slate-800 p-2 text-sm"
        >
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded bg-slate-800 p-2 text-sm"
        >
          <option value="">Select category</option>
          {(data?.categories ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <button className="rounded bg-blue-600 px-4 py-2 text-sm" disabled={submit.isPending}>
        Submit
      </button>
    </form>
  );
}

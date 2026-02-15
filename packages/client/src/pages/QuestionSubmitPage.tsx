import { FormEvent, useState } from 'react';
import { LoadingButton } from '../components/LoadingButton';
import { useCategories, useSubmitQuestionMutation } from '../hooks/queries';

export function QuestionSubmitPage() {
  const { data } = useCategories();
  const submit = useSubmitQuestionMutation();

  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [categoryId, setCategoryId] = useState('');

  const resetForm = () => {
    setText('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setDifficulty('EASY');
    setCategoryId('');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submit.mutateAsync({ text, options, correctIndex, difficulty, categoryId });
    resetForm();
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
      <p className="text-sm text-slate-300">Correct answer (select one option):</p>
      {options.map((option, index) => (
        <label
          key={index}
          className="flex items-center gap-3 rounded bg-slate-800 p-2 text-sm text-slate-100"
        >
          <input
            type="radio"
            name="correctOption"
            checked={correctIndex === index}
            onChange={() => setCorrectIndex(index)}
            aria-label={`Mark option ${index + 1} as correct`}
          />
          <input
            className="w-full rounded bg-slate-700 p-2 text-sm"
            value={option}
            onChange={(e) =>
              setOptions((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))
            }
            placeholder={`Option ${index + 1}`}
          />
        </label>
      ))}
      <div className="grid gap-2 sm:grid-cols-2">
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
      <LoadingButton
        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        isLoading={submit.isPending}
        loadingText="Submitting..."
      >
        Submit
      </LoadingButton>
    </form>
  );
}

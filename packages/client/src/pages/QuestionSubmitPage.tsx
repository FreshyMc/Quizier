import { FormEvent, useState } from 'react';
import { LoadingButton } from '../components/LoadingButton';
import { useCategories, useSubmitQuestionMutation } from '../hooks/queries';
import { useFormErrors } from '../hooks/useFormErrors';

export function QuestionSubmitPage() {
  const { data } = useCategories();
  const submit = useSubmitQuestionMutation();

  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [categoryId, setCategoryId] = useState('');
  const { fieldErrors, formError, clearErrors, clearFieldError, handleSubmitError } = useFormErrors<
    | 'text'
    | 'options'
    | 'options[0]'
    | 'options[1]'
    | 'options[2]'
    | 'options[3]'
    | 'correctIndex'
    | 'difficulty'
    | 'categoryId'
  >();

  const resetForm = () => {
    setText('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setDifficulty('EASY');
    setCategoryId('');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearErrors();
    try {
      await submit.mutateAsync({ text, options, correctIndex, difficulty, categoryId });
      resetForm();
    } catch (submitError) {
      handleSubmitError(submitError, 'Unable to submit question');
    }
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
        onChange={(e) => {
          setText(e.target.value);
          clearFieldError('text');
        }}
        placeholder="Question"
      />
      {fieldErrors.text ? <p className="text-xs text-rose-300">{fieldErrors.text}</p> : null}
      <p className="text-sm text-slate-300">Correct answer (select one option):</p>
      {fieldErrors.correctIndex ? (
        <p className="text-xs text-rose-300">{fieldErrors.correctIndex}</p>
      ) : null}
      {options.map((option, index) => {
        const optionField = `options[${index}]` as
          | 'options[0]'
          | 'options[1]'
          | 'options[2]'
          | 'options[3]';

        return (
          <div key={index}>
            <label className="flex items-center gap-3 rounded bg-slate-800 p-2 text-sm text-slate-100">
              <input
                type="radio"
                name="correctOption"
                checked={correctIndex === index}
                onChange={() => {
                  setCorrectIndex(index);
                  clearFieldError('correctIndex');
                }}
                aria-label={`Mark option ${index + 1} as correct`}
              />
              <input
                className="w-full rounded bg-slate-700 p-2 text-sm"
                value={option}
                onChange={(e) => {
                  setOptions((prev) =>
                    prev.map((item, optionIndex) =>
                      optionIndex === index ? e.target.value : item,
                    ),
                  );
                  clearFieldError(optionField);
                  clearFieldError('options');
                }}
                placeholder={`Option ${index + 1}`}
              />
            </label>
            {fieldErrors[optionField] ? (
              <p className="mt-1 text-xs text-rose-300">{fieldErrors[optionField]}</p>
            ) : null}
          </div>
        );
      })}
      {fieldErrors.options ? <p className="text-xs text-rose-300">{fieldErrors.options}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD');
            clearFieldError('difficulty');
          }}
          className="rounded bg-slate-800 p-2 text-sm"
        >
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            clearFieldError('categoryId');
          }}
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
      {fieldErrors.difficulty ? (
        <p className="text-xs text-rose-300">{fieldErrors.difficulty}</p>
      ) : null}
      {fieldErrors.categoryId ? (
        <p className="text-xs text-rose-300">{fieldErrors.categoryId}</p>
      ) : null}
      {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
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

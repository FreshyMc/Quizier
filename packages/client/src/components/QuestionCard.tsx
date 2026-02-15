type Props = {
  text: string;
  options: string[];
  selectedOption: number | null;
  disabled: boolean;
  onSelect: (index: number) => void;
  onSubmit: () => void;
};

export function QuestionCard({
  text,
  options,
  selectedOption,
  disabled,
  onSelect,
  onSubmit,
}: Props) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h3 className="text-lg font-semibold text-white">{text}</h3>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              className={`rounded border px-3 py-2 text-left text-sm transition ${
                selectedOption === index
                  ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                  : 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              onClick={() => onSelect(index)}
              disabled={disabled}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || selectedOption === null}
        >
          Submit answer
        </button>
      </form>
    </section>
  );
}

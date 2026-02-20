type InputProps = {
  placeholder: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const Input = ({ placeholder, type, value, onChange }: InputProps) => {
  return (
    <input
      className="w-full rounded bg-slate-800 focus:border-1 focus:border-blue-500 p-2 text-sm outline-none"
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={onChange}
    />
  );
};

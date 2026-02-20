import { useState } from 'react';
import { Input } from './Input';

type PasswordInputProps = {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const PasswordInput = ({ placeholder, value, onChange }: PasswordInputProps) => {
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        type={showValue ? 'text' : 'password'}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-full w-5 text-slate-400 cursor-pointer"
        onClick={() => setShowValue((prev) => !prev)}
      >
        {showValue ? <i className="fa-solid fa-eye" /> : <i className="fa-solid fa-eye-slash" />}
      </button>
    </div>
  );
};

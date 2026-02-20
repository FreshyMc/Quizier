import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { InlineSpinner } from './InlineSpinner';

const loadingButtonVariants = {
  primary:
    'w-full  hover:bg-blue-700 transition-colors cursor-pointer rounded bg-blue-600 px-4 py-2 text-base text-white disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center gap-2',
  logout:
    'flex w-full items-center justify-center cursor-pointer gap-2 rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60',
  danger:
    'inline-flex items-center cursor-pointer gap-1 rounded bg-rose-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60',
};

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: ReactNode;
  spinnerClassName?: string;
  variant?: keyof typeof loadingButtonVariants;
  modifier?: string;
};

export function LoadingButton({
  isLoading = false,
  loadingText,
  spinnerClassName,
  children,
  disabled,
  variant = 'primary',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${loadingButtonVariants[variant]} ${props?.modifier ?? ''}`}
    >
      {isLoading ? <InlineSpinner className={spinnerClassName} /> : null}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}

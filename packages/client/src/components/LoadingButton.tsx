import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { InlineSpinner } from './InlineSpinner';

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: ReactNode;
  spinnerClassName?: string;
};

export function LoadingButton({
  isLoading = false,
  loadingText,
  spinnerClassName,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <button {...props} disabled={disabled || isLoading}>
      {isLoading ? <InlineSpinner className={spinnerClassName} /> : null}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}

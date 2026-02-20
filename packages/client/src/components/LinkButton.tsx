import { ReactNode } from 'react';
import { Link } from 'react-router';

const linkVariants = {
  primary:
    'rounded bg-blue-600 hover:bg-blue-700 transition-colors w-full px-4 py-2.5 text-base text-white text-center',
  secondary:
    'rounded bg-slate-700 hover:bg-slate-800 transition-colors w-full px-4 py-2.5 text-base text-white text-center',
};

export const LinkButton = ({
  to,
  children,
  variant = 'primary',
}: {
  to: string;
  children: ReactNode;
  variant?: keyof typeof linkVariants;
}) => {
  return (
    <Link className={linkVariants[variant]} to={to}>
      {children}
    </Link>
  );
};

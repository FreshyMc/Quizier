import { ReactNode } from 'react';

const containerVariants = {
  main: 'flex flex-col w-full min-h-screen from-cyan-500 to-blue-500 bg-gradient-to-br',
  default: 'mx-auto max-w-4xl px-4 py-8',
};

const alignmentVariants = {
  center: 'flex items-center justify-center',
};

export const Container = ({
  children,
  variant = 'default',
  alignment,
}: {
  children: ReactNode;
  variant?: keyof typeof containerVariants;
  alignment?: keyof typeof alignmentVariants;
}) => {
  const className = `${containerVariants[variant]} ${alignment ? alignmentVariants[alignment] : ''}`;
  return <div className={className}>{children}</div>;
};

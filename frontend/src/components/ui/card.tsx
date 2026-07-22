import React from 'react';

export interface CardProps {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-[var(--bg-card)] border border-[var(--border)]',
    elevated: 'bg-[var(--bg-elevated)] border border-[var(--violet-border)] shadow-[var(--shadow-lg)]',
    bordered: 'bg-[var(--bg-card)] border-2 border-[var(--violet-border-strong)]',
  };

  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-[var(--dur-fast)] ease-[var(--ease-premium)] hover:-translate-y-0.5 ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`mb-4 ${className}`}>{children}</div>;

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h3 className={`font-display font-bold text-lg text-[var(--text)] ${className}`}>
    {children}
  </h3>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`text-[var(--text-2)] ${className}`}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between ${className}`}
  >
    {children}
  </div>
);

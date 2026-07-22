import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-300 ease-premium disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
  
  const variantStyles = {
    primary: 'bg-[var(--violet-strong)] hover:bg-[var(--violet-deep)] text-white border border-[var(--violet-border)] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all',
    secondary: 'bg-[var(--bg-muted)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--violet-border)] hover:text-[var(--violet)] transition-all',
    ghost: 'bg-transparent text-[var(--text-2)] hover:bg-[var(--violet-soft)] hover:text-[var(--text)] border border-transparent transition-all',
    danger: 'bg-[var(--error)] text-white border border-[var(--error)]/20 hover:opacity-90 transition-all',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

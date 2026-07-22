import React from 'react';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors';
  
  const variantStyles = {
    default: 'bg-violet-primary/10 text-violet-tertiary border border-violet-primary/20',
    success: 'bg-success-bg text-success-primary border border-success-border',
    warning: 'bg-warning-bg text-warning-primary border border-warning-border',
    error: 'bg-error-bg text-error-primary border border-error-border',
    info: 'bg-info-bg text-info-primary border border-info-border',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };
  
  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
};

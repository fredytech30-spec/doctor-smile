import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: string;
  icon?: React.ReactNode;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    error,
    icon,
    label,
    className = '',
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-3 rounded-lg bg-surface-secondary border border-border-default
              text-text-primary placeholder:text-text-muted
              transition-all duration-300 ease-premium
              focus:outline-none focus:border-violet-primary focus:shadow-violet focus:ring-2 focus:ring-violet-primary/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-error-primary focus:border-error-primary focus:ring-error-primary/20' : ''}
              ${icon ? 'pl-10' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-error-primary flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  error,
  label,
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full px-4 py-3 rounded-lg bg-surface-secondary border border-border-default
          text-text-primary placeholder:text-text-muted
          transition-all duration-300 ease-premium
          focus:outline-none focus:border-violet-primary focus:shadow-violet focus:ring-2 focus:ring-violet-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed resize-none
          ${error ? 'border-error-primary focus:border-error-primary focus:ring-error-primary/20' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-error-primary flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

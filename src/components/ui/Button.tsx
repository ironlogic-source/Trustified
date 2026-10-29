import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'brass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-ink text-white hover:bg-ink/90 active:bg-ink border border-ink shadow-subtle',
    secondary:
      'bg-surface text-body hover:bg-paper active:bg-hairline/20 border border-hairline',
    danger:
      'bg-brick text-white hover:bg-brick/90 active:bg-brick border border-brick',
    ghost:
      'bg-transparent text-body hover:bg-paper active:bg-hairline/30 border border-transparent',
    brass:
      'bg-brass text-white hover:bg-brass/90 active:bg-brass border border-brass',
  };

  const sizeStyles = {
    sm: 'text-xs h-7 px-2.5 gap-1.5 rounded-sm',
    md: 'text-sm h-8 px-3.5 gap-2 rounded-sm',
    lg: 'text-base h-10 px-4 gap-2.5 rounded-sm',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-sans font-medium transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};

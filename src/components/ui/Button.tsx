'use client';

import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-gradient-secondary-premium text-on-primary hover:shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 active:translate-y-0 border border-secondary/20',
    secondary: 'bg-gradient-accent-premium text-on-primary hover:shadow-lg hover:shadow-secondary/10 hover:-translate-y-0.5 active:translate-y-0',
    outline: 'bg-surface/50 backdrop-blur-sm border border-border-subtle/80 text-on-surface hover:bg-surface-container-low hover:border-secondary/30 hover:-translate-y-0.5 active:translate-y-0',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[12px] rounded-lg',
    md: 'px-4 py-2 text-[12.5px] rounded-xl',
    lg: 'px-5.5 py-2.5 text-[13px] rounded-xl',
  };

  const iconSizeClasses = {
    sm: 'text-[16px]',
    md: 'text-[18px]',
    lg: 'text-[20px]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-label-md text-label-md
        transition-all transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.97] cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon && iconPosition === 'left' && (
        <span className={`material-symbols-outlined ${iconSizeClasses[size]}`}>{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className={`material-symbols-outlined ${iconSizeClasses[size]}`}>{icon}</span>
      )}
    </button>
  );
}
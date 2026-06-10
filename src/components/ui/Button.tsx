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
    primary: 'bg-primary text-on-primary hover:bg-primary/90 shadow-sm',
    secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90',
    outline: 'bg-surface border border-border-subtle text-on-surface hover:bg-surface-container',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-4 py-2 text-[12px]',
    lg: 'px-5 py-2.5 text-[12px]',
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
        inline-flex items-center justify-center gap-2 rounded font-label-md text-label-md
        transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
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
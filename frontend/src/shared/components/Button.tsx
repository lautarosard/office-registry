import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';

const VARIANTS = {
  primary: 'bg-navy-800 text-white hover:bg-navy-900',
  success: 'bg-green-800 text-white hover:bg-green-900',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  secondary: 'border border-gray-500 bg-white text-gray-900 hover:bg-gray-100',
  outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 py-2',
  lg: 'h-11 px-8',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', type = 'button', ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

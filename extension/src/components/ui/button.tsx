import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** ボタンのバリアント */
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'link'
  /** ボタンのサイズ */
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      link: 'underline-offset-4 hover:underline text-primary',
    }
    const sizeClasses = {
      default: 'px-4 py-2 h-10',
      sm: 'px-3 h-9 rounded-md',
      lg: 'px-8 h-11',
      icon: 'p-0 h-10 w-10',
    }
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

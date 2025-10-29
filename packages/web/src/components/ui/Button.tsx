import { Icon } from '@iconify/react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  name: string;
  icon?: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export default function Button({
  name,
  icon,
  onClick,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  const variants = {
    primary:
      'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-xl',
    secondary:
      'bg-white hover:bg-gray-50 text-gray-800 border border-blue-200 shadow-md hover:shadow-lg',
    ghost:
      'bg-white/50 hover:bg-white/80 text-gray-700 hover:text-gray-900 border border-blue-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full ${variants[variant]} font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
    >
      {icon && <Icon icon={icon} width="20" height="20" />}
      {name}
    </button>
  );
}

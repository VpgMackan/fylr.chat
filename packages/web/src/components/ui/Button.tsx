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
      'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl',
    secondary:
      'bg-white hover:bg-gray-100 text-gray-800 shadow-md hover:shadow-lg border border-gray-300',
    ghost: 'bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900',
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

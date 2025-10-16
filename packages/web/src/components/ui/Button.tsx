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
      'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    ghost: 'bg-transparent hover:bg-blue-50 text-gray-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full ${variants[variant]} font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon && <Icon icon={icon} width="20" height="20" />}
      {name}
    </button>
  );
}

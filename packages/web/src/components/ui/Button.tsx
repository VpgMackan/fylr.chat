import { Icon } from '@iconify/react';

export default function Button({
  name,
  icon,
}: {
  name: string;
  icon?: string;
}) {
  return (
    <div className="w-full">
      <button className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2">
        {icon && <Icon icon={icon} width="20" height="20" />}
        {name}
      </button>
    </div>
  );
}

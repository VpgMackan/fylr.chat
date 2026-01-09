import { JSX, ReactNode } from 'react';
import { Icon } from '@iconify/react';

export default function SmallModal({
  onClose,
  accent,
  title,
  icon,
  footerText,
  FooterComponents,
  children,
}: {
  onClose: () => void;
  accent: 'orange' | 'blue';
  title: string;
  icon: string;
  footerText: string;
  FooterComponents?: () => JSX.Element;
  children: ReactNode;
}) {
  const gradientBackground =
    accent == 'blue'
      ? 'from-blue-50 to-indigo-50'
      : 'from-orange-50 to-yellow-50';
  const gradientIcon1 =
    accent == 'blue'
      ? 'bg-blue-100 dark:bg-blue-900'
      : 'bg-orange-100 dark:bg-orange-900';
  const gradientIcon2 =
    accent == 'blue'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-orange-600 dark:text-orange-400';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div
          className={`px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r ${gradientBackground} dark:from-gray-800 dark:to-gray-900`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 ${gradientIcon1} rounded-lg`}>
              <Icon icon={icon} className={`text-2xl ${gradientIcon2}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-all"
            aria-label="Close"
          >
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {footerText}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all shadow-sm hover:shadow-md"
            >
              Done
            </button>
            {FooterComponents && <FooterComponents />}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Icon } from '@iconify/react';
import { Checkbox } from '@headlessui/react';

export default function SourceCheckbox({
  fileName,
  fileType,
  checked,
  onClick,
}: {
  fileName: string;
  fileType: string;
  checked: boolean;
  onClick: () => void;
}) {
  const fileIcon: Record<string, string> = {
    'text/markdown': 'material-symbols:markdown-outline',
    pdf: 'proicons:pdf-2',
    web: 'mdi:web',
  };

  return (
    <div className="flex bg-blue-200 hover:bg-blue-300 transition-colors duration-150 rounded-lg border border-blue-400 p-3 justify-between items-center cursor-pointer">
      <div className="flex items-center space-x-2">
        <Icon
          icon={fileIcon[fileType]}
          width="20"
          height="20"
          className="text-blue-700"
        />
        <p className="text-sm font-medium text-gray-800">{fileName}</p>
      </div>
      <Checkbox
        className="group block size-5 rounded border border-gray-400 bg-white data-[checked]:bg-blue-600 data-[checked]:border-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
        checked={checked}
        onClick={onClick}
      >
        <Icon
          icon="uim:check"
          width="20"
          height="20"
          className="text-white opacity-0 group-data-[checked]:opacity-100"
        />
      </Checkbox>
    </div>
  );
}

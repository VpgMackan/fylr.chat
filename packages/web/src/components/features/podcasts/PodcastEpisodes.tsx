import { Icon } from '@iconify/react';

export default function PodcastEpisodes({
  fileName,
  fileType = 'episode',
  selected = false,
  onClick = () => {},
}: {
  fileName: string;
  fileType?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const fileIcon: Record<string, string> = {
    pdf: 'proicons:pdf-2',
    web: 'mdi:web',
    episode: 'ph:microphone-fill',
  };
  const color = selected
    ? 'bg-blue-400 hover:bg-blue-300'
    : 'bg-blue-200 hover:bg-blue-300';

  return (
    <div
      onClick={onClick}
      className={`flex ${color} transition-colors duration-150 rounded-lg border border-blue-400 p-3 justify-between items-center cursor-pointer`}
    >
      <Icon
        icon={fileIcon[fileType]}
        width="20"
        height="20"
        className="text-blue-700"
      />
      <p className="text-sm font-medium text-gray-800">{fileName}</p>
    </div>
  );
}

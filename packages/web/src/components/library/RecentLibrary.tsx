interface RecentLibraryProps {
  name: string;
  id?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export default function RecentLibrary({
  name,
  id,
  isActive,
  onClick,
}: RecentLibraryProps) {
  return (
    <div
      onClick={onClick}
      className="relative bg-blue-100 border-2 border-blue-300 rounded-lg p-6 w-32 h-32 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="absolute bottom-3 right-3 w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="text-xs text-gray-600 font-medium">{name}</div>
    </div>
  );
}

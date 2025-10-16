import RecentLibrary from './RecentLibrary';

interface Library {
  id: string;
  name: string;
}

interface RecentLibraryGridProps {
  libraries?: Library[];
  onLibraryClick?: (id: string) => void;
}

export default function RecentLibraryGrid({
  libraries = [
    { id: '1', name: 'Library 1' },
    { id: '2', name: 'Library 2' },
    { id: '3', name: 'Library 3' },
  ],
  onLibraryClick,
}: RecentLibraryGridProps) {
  return (
    <div className="flex gap-2">
      {libraries.map((lib) => (
        <RecentLibrary
          key={lib.id}
          name={lib.name}
          onClick={() => onLibraryClick?.(lib.id)}
        />
      ))}
    </div>
  );
}

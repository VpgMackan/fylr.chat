import { ReactNode, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '@/components/common/Button';
import SearchBar from '@/components/SearchBar';
import Dropdown from '@/components/common/Dropdown';
import Heading from '@/components/layout/Heading';

export type DropdownOption = { value: string | number; label: string };

interface ListPageLayoutProps<T extends { id: string | number }> {
  title: string;
  onBack?: () => void;
  onCreate: () => void;
  createText: string;
  searchLabel: string;
  clearSearchLabel: string;
  dropdownOptions: DropdownOption[];
  dropdownPlaceholder?: string;
  dropdownAriaLabel?: string;
  gridClassName?: string;

  dataLoader?: (params: {
    take: number;
    offset: number;
    searchTerm: string;
    dropdownValue: string | number;
  }) => Promise<T[]>;
  take?: number;
  skeleton?: ReactNode;
  skeletonCount?: number;
  renderItems?: (items: T[]) => ReactNode;

  children?: ReactNode;
}

export default function ListPageLayout<T extends { id: string | number }>({
  title,
  onBack,
  onCreate,
  createText,
  searchLabel,
  clearSearchLabel,
  dropdownOptions,
  dropdownPlaceholder,
  dropdownAriaLabel,
  gridClassName = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',

  dataLoader,
  take = 10,
  skeleton,
  skeletonCount = 6,
  renderItems,

  children,
}: ListPageLayoutProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownValue, setDropdownValue] = useState<string | number>('');

  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const loadMore = async () => {
    if (!dataLoader) return;
    setLoadingMore(true);
    try {
      const data = await dataLoader({
        take,
        offset,
        searchTerm,
        dropdownValue,
      });
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = data.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      setOffset((o) => o + data.length);
      if (data.length < take) setHasMore(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!dataLoader || hasFetched.current) return;
    hasFetched.current = true;
    (async () => {
      setLoading(true);
      try {
        const data = await dataLoader({
          take,
          offset: 0,
          searchTerm,
          dropdownValue,
        });
        setItems(data);
        setOffset(data.length);
        if (data.length < take) setHasMore(false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [dataLoader, take, searchTerm, dropdownValue]);

  useEffect(() => {
    if (!dataLoader || !loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMore();
      },
      { rootMargin: '200px' },
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [dataLoader, hasMore, loadingMore]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchTerm(e.target.value);
  const handleClear = () => setSearchTerm('');
  const handleDropdown = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setDropdownValue(e.target.value);

  return (
    <Heading
      title={title}
      leadingTitleAccessory={
        onBack && <Icon icon="weui:back-outlined" onClick={onBack} />
      }
    >
      <div className="mt-8 mb-4 space-y-4">
        <div className="flex justify-between items-center space-x-4">
          <SearchBar
            {...{
              value: searchTerm,
              onChange: handleSearchChange,
              onClear: handleClear,
            }}
            placeholder={searchLabel}
            ariaLabel={searchLabel}
            clearLabel={clearSearchLabel}
          />
          <Dropdown
            options={dropdownOptions}
            selectedValue={dropdownValue}
            onChange={handleDropdown}
            placeholder={dropdownPlaceholder}
            ariaLabel={dropdownAriaLabel}
            className="mr-2"
          />
          <Button text={createText} onClick={onCreate} />
        </div>
        <div className={`grid ${gridClassName} gap-4`}>
          {dataLoader
            ? loading
              ? Array.from({ length: skeletonCount }).map((_) => (
                  <>{skeleton}</>
                ))
              : renderItems?.(items)
            : children}
        </div>

        {dataLoader && (
          <>
            <div ref={loaderRef} />
            {loadingMore && skeleton}
          </>
        )}
      </div>
    </Heading>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import ListPageLayout, {
  DropdownOption,
} from "@/components/layout/ListPageLayout";
import Pocket from "@/components/Pocket";
import { useEffect, useRef, useState } from "react";
import axios from "@/utils/axios";
import PocketSkeleton from "@/components/loading/Pocket";

export default function PocketPage() {
  const router = useRouter();
  const t = useTranslations("pages.pocketList");
  const commonT = useTranslations("common");

  const take = 10;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const [pockets, setPockets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    (async () => {
      try {
        const { data } = await axios.get("pocket", {
          params: { take, offset: 0 },
        });
        setPockets(data);
        setOffset(data.length);
        if (data.length < take) setHasMore(false);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // infinite‐scroll observer
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [loadingMore, hasMore]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await axios.get("pocket", {
        params: { take, offset },
      });
      setPockets((prev) => {
        interface PocketItem {
          id: string | number;
          title: string;
          icon: string;
          description: string;
          createdAt: string;
          source: any[];
        }

        const newItems: PocketItem[] = data.filter(
          (item: PocketItem) => !prev.some((p: PocketItem) => p.id === item.id)
        );
        return [...prev, ...newItems];
      });
      setOffset((prev) => prev + data.length);
      if (data.length < take) setHasMore(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const dropdownOptions: DropdownOption[] = [
    { value: 1, label: t("mostRecent") },
    { value: 2, label: t("title") },
    { value: 3, label: t("created") },
  ];

  return (
    <ListPageLayout
      title={t("yourPockets")}
      onBack={() => router.back()}
      onCreate={() => router.push("/pocket/new")}
      createText={commonT("buttons.create")}
      searchLabel={t("searchLabel")}
      clearSearchLabel={t("clearSearchLabel")}
      dropdownOptions={dropdownOptions}
      gridClassName="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
    >
      {loading
        ? Array.from({ length: 6 }, (_, i) => <PocketSkeleton key={i} />)
        : pockets.map(({ id, description, createdAt, title, icon, source }) => (
            <Pocket
              key={id}
              title={title}
              icon={icon}
              description={description}
              sources={source.length}
              created={createdAt}
              id={id}
            />
          ))}

      <div ref={loaderRef} />

      {loadingMore && <PocketSkeleton />}
    </ListPageLayout>
  );
}

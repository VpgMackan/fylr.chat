"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import axios from "@/utils/axios";

import Button from "@/components/common/Button";
import Pocket from "@/components/Pocket";
import PocketSkeleton from "@/components/loading/Pocket";
import Chat from "@/components/Chat";
import PinnedPod from "@/components/PodcastListItem";
import Heading from "@/components/layout/Heading";
import Section from "@/components/layout/Section";
import { withAuth } from "@/components/auth/withAuth";
import ChatSkeleton from "@/components/loading/Chat";

function HomePage() {
  const hasFetched = useRef(false);

  const common = useTranslations("common.buttons");
  const yourPockets = useTranslations("pockets.labels");
  const t = useTranslations("pages.home");
  const router = useRouter();

  const [pockets, setPockets] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      try {
        await new Promise((f) => setTimeout(f, 1000));
        const { data: pocketsData } = await axios.get("pocket");
        setPockets(pocketsData);

        const { data: chatsData } = await axios.get("chat/user/all");
        setRecentChats(chatsData);

        setLoading(false);
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <Heading
      title={t("welcome", { name: "Markus" })}
      behindTitle={<Icon icon="twemoji:waving-hand" flip="horizontal" />}
    >
      <Section
        title={yourPockets("yourPockets")}
        actions={
          <>
            <Button
              text={common("viewAll")}
              className="mr-2"
              onClick={() => router.push("/pocket")}
            />
            <Button
              text={common("create")}
              onClick={() => router.push("/pocket/new")}
            />
          </>
        }
        cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
      >
        {loading
          ? Array.from(
              { length: Math.floor(Math.random() * 6) + 1 },
              (_, index) => <PocketSkeleton key={index} />
            )
          : pockets.map(({ id, description, createdAt, title, icon }) => (
              <Pocket
                key={id}
                title={title}
                icon={icon}
                description={description}
                sources={12}
                created={createdAt}
                id={id}
              />
            ))}
      </Section>

      <Section title={t("mostRecentChat")}>
        {loading
          ? Array.from(
              { length: Math.floor(Math.random() * 3) + 1 },
              (_, index) => <ChatSkeleton key={index} />
            )
          : recentChats.map(({ id, title, pocket }) => (
              <Chat
                key={id}
                title={title}
                pocket={pocket.title}
                description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              />
            ))}
      </Section>

      <Section title={t("pinnedPodcasts")}>
        <PinnedPod title="Lorem ipsum" pocket="Lorem" />
      </Section>
    </Heading>
  );
}

export default withAuth(HomePage);

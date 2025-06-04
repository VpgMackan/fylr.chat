"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";

import Button from "@/components/common/Button";
import Pocket from "@/components/Pocket";
import Chat from "@/components/Chat";
import PinnedPod from "@/components/PodcastListItem";
import Heading from "@/components/layout/Heading";
import Section from "@/components/layout/Section";
import { withAuth } from "@/components/auth/withAuth";

function HomePage() {
  const common = useTranslations("common.buttons");
  const yourPockets = useTranslations("pockets.labels");
  const t = useTranslations("pages.home");
  const router = useRouter();

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
        <Pocket
          title="🧠 Lorem"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          sources={12}
          created="2025/04/13"
          id="e57b8ddd-c118-43cf-a595-067579b62b97"
        />
      </Section>

      <Section title={t("mostRecentChat")}>
        <Chat
          title="Lorem ipsum"
          pocket="Lorem"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        />
      </Section>

      <Section title={t("pinnedPodcasts")}>
        <PinnedPod title="Lorem ipsum" pocket="Lorem" />
      </Section>
    </Heading>
  );
}

export default withAuth(HomePage);

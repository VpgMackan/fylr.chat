import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <div>
      <div className="flex text-5xl ">
        <h1 className="mr-8 font-bold">{t("welcome", { name: "Markus" })}</h1>
        <Icon icon="twemoji:waving-hand" flip="horizontal" />
      </div>
      <div className="flex text-3xl mt-8">
        <h1 className="mr-8 font-bold">{t("yourPockets")}</h1>
      </div>
    </div>
  );
}

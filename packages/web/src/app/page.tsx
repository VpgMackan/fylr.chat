import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

function Pocket({
  title,
  description,
  sources,
  created,
  translation,
}: {
  title: string;
  description: string;
  sources: number;
  created: string;
  translation: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-500 mb-2">{description}</p>
      </div>

      <div>
        <hr />
        <p className="text-xs mt-2">
          {translation("sources", { amount: sources })}
        </p>
        <p className="text-xs">{translation("created", { date: created })}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <div>
      <div className="flex text-5xl ">
        <p className="mr-8 font-bold">{t("welcome", { name: "Markus" })}</p>
        <Icon icon="twemoji:waving-hand" flip="horizontal" />
      </div>
      <div>
        <div className="flex justify-between items-center space-x-4 mt-8 mb-4">
          <p className="font-semibold text-3xl">{t("yourPockets")}</p>
          <button className="border border-gray-300 rounded-lg py-2 px-4 text-2xl hover:bg-gray-100 transition-colors duration-200">
            {t("viewAll")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Pocket
            title="🧠 Lorem"
            description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            sources={12}
            created="2025/04/13"
            translation={t}
          />
          <Pocket
            title="🧠 Ipsum"
            description="Dolor sit amet, consectetur adipiscing elit."
            sources={8}
            created="2025/04/12"
            translation={t}
          />
          <Pocket
            title="🧠 Sit Amet"
            description="Consectetur adipiscing elit."
            sources={15}
            created="2025/04/11"
            translation={t}
          />
          <Pocket
            title="🧠 Ipsum"
            description="Dolor sit amet, consectetur adipiscing elit."
            sources={8}
            created="2025/04/12"
            translation={t}
          />
          <Pocket
            title="🧠 Sit Amet"
            description="Consectetur adipiscing elit."
            sources={15}
            created="2025/04/11"
            translation={t}
          />
          <Pocket
            title="🧠 Ipsum"
            description="Dolor sit amet, consectetur adipiscing elit."
            sources={8}
            created="2025/04/12"
            translation={t}
          />
        </div>
      </div>
    </div>
  );
}

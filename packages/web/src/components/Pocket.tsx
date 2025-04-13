import React from "react";
import { useTranslations } from "next-intl";

export default function Pocket({
  title,
  description,
  sources,
  created,
}: {
  title: string;
  description: string;
  sources: number;
  created: string;
}) {
  const common = useTranslations("common");
  return (
    <div className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-500 mb-2">{description}</p>
      </div>

      <div>
        <hr />
        <p className="text-xs mt-2">{common("sources", { amount: sources })}</p>
        <p className="text-xs">{common("created", { date: created })}</p>
      </div>
    </div>
  );
}

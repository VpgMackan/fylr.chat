import React from "react";
import { useTranslations } from "next-intl";

export default function Chat({
  title,
  pocket,
  description,
}: {
  title: string;
  pocket: string;
  description: string;
}) {
  const common = useTranslations("pockets");
  return (
    <div className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div className="flex justify-between">
        <p className="font-semibold">{title}</p>
        <p className="font-semibold">
          {common("labels.pocketName", { pocketName: pocket })}
        </p>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

import React from "react";
import { useTranslations } from "next-intl";
import Button from "./Button";

export default function PinnedPod({
  title,
  pocket,
}: {
  title: string;
  pocket: string;
}) {
  const common = useTranslations("common");
  
  return (
    <div className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div className="flex justify-between mb-8">
        <p className="font-semibold">{title}</p>
        <p className="font-semibold">
          {common("pocketName", { pocketName: pocket })}
        </p>
      </div>
      <Button text={common("goToPodcast")} />
    </div>
  );
}

import React from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";

export default function Source({
  title,
  summery,
  size,
  imported,
  id,
  pocketId,
}: {
  title: string;
  summery: string;
  size: string;
  imported: string;
  id: string;
  pocketId: string;
}) {
  const router = useRouter();
  const common = useTranslations("common");

  const handleClick = () => {
    router.push(`/pocket/${pocketId}/source/${id}`);
  };

  return (
    <div
      className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
      onClick={handleClick}
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-500 mb-2">{summery}</p>
      </div>

      <div>
        <hr />
        <p className="text-xs mt-2">
          {common("metadata.size", { size: size })}
        </p>
        <p className="text-xs">
          {common("metadata.imported", { date: imported })}
        </p>
      </div>
    </div>
  );
}

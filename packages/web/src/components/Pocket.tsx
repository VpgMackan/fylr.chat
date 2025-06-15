import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";

import { useRouter } from "next/navigation";

export default function Pocket({
  title,
  icon,
  description,
  sources,
  created,
  id,
}: {
  title: string;
  icon: string;
  description: string;
  sources: number;
  created: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const common = useTranslations("common.metadata");

  const handleClick = () => {
    router.push(`/pocket/${id}`);
  };

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      className={`w-full bg-transparent text-left border border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-500 ease-in-out flex flex-col justify-between ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClick}
    >
      <div>
        <div className="flex items-center">
          <Icon icon={icon} className="h-5 w-5 mr-2" />
          <p className="font-semibold">{title}</p>
        </div>
        <p className="text-sm text-gray-500 mb-2">{description}</p>
      </div>

      <div>
        <hr />
        <p className="text-xs mt-2">{common("sources", { amount: sources })}</p>
        <p className="text-xs">{common("created", { date: created })}</p>
      </div>
    </button>
  );
}

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";

export default function Pocket({
  title,
  description,
  sources,
  created,
  id,
}: {
  title: string;
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
    const timer = setTimeout(() => setVisible(true), 50); // Slight delay for transition
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`border border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-500 ease-in-out flex flex-col justify-between ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClick}
    >
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

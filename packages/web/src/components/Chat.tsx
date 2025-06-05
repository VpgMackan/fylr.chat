import React, { useState, useEffect } from "react";
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
  const [visible, setVisible] = useState(false);
  const common = useTranslations("pockets");

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`border border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-500 ease-in-out flex flex-col justify-between ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
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

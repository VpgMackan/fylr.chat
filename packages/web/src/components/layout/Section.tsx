import React from "react";

interface SectionProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  cols?: string; // tailwind grid‐cols classes
  children: React.ReactNode;
}

export default function Section({
  title,
  actions,
  cols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  children,
}: SectionProps) {
  return (
    <section className="mt-8 mb-4">
      <div className="flex justify-between items-center space-x-4 mb-4">
        <p className="font-semibold text-3xl">{title}</p>
        {actions && <div className="flex">{actions}</div>}
      </div>
      <div className={`grid ${cols} gap-4`}>{children}</div>
    </section>
  );
}

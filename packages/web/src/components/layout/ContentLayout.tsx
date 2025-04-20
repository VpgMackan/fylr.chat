"use client";

import React from "react";

import Heading from "@/components/layout/Heading";

export default function ContentLayout({
  title,
  infrontTitle,
  rightSideContent,
  sidebarContent,
  children,
}: {
  title: string;
  infrontTitle: React.ReactNode;
  rightSideContent: React.ReactNode;
  sidebarContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Heading
      title={title}
      infrontTitle={infrontTitle}
      rightSideContent={rightSideContent}
    >
      <div
        className="grid grid-cols-6 gap-4 h-full overflow-y-hidden pb-4 pt-8"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="bg-blue-100 rounded-2xl border-2 border-blue-300 p-4">
          {sidebarContent}
        </div>

        <div className="bg-blue-100 col-span-5 rounded-2xl border-2 border-blue-300 p-4 flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </Heading>
  );
}

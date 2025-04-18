import React from "react";

export default function Heading({
  title,
  children,
  infrontTitle,
  behindTitle,
  rightSideContent,
}: {
  title: string;
  children?: React.ReactNode;
  infrontTitle?: React.ReactNode;
  behindTitle?: React.ReactNode;
  rightSideContent?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex text-5xl items-center justify-between">
        <div className="flex">
          {infrontTitle ? <div className="mr-8">{infrontTitle}</div> : null}
          <p className="font-bold">{title}</p>
          {behindTitle ? <div className="ml-8">{behindTitle}</div> : null}
        </div>
        {rightSideContent}
      </div>
      {children}
    </div>
  );
}

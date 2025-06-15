import React from "react";

export default function Heading({
  title,
  children,
  leadingTitleAccessory,
  behindTitle,
  trailingHeaderActions,
}: {
  title: string;
  children?: React.ReactNode;
  leadingTitleAccessory?: React.ReactNode;
  behindTitle?: React.ReactNode;
  trailingHeaderActions?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex text-5xl items-center justify-between">
        <div className="flex">
          {leadingTitleAccessory ? (
            <div className="mr-8">{leadingTitleAccessory}</div>
          ) : null}
          <p className="font-bold">{title}</p>
          {behindTitle ? <div className="ml-8">{behindTitle}</div> : null}
        </div>
        {trailingHeaderActions}
      </div>
      {children}
    </>
  );
}

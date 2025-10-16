interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen">
      {sidebar}
      <div className="w-full flex justify-center">{children}</div>
    </div>
  );
}

'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import HomeView from '@/components/features/home/HomeView';

export default function HomePage() {
  return (
    <MainLayout sidebar={<Sidebar />}>
      <HomeView />
    </MainLayout>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function PodcastIdPageView() {
  const params = useParams();
  const podcastId = params.podcastid as string;
  return <div></div>;
}

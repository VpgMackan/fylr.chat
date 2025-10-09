'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function LibraryIdPageView() {
  const params = useParams();
  const libraryId = params.libraryid as string;
  return <div></div>;
}

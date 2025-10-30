'use client';

import { useEffect, useRef } from 'react';

export default function CursorFollower() {
  const followerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      const lerp = 0.05;

      currentRef.current.x +=
        (positionRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y +=
        (positionRef.current.y - currentRef.current.y) * lerp;

      if (followerRef.current) {
        followerRef.current.style.transform = `translate(${currentRef.current.x - window.innerWidth / 2}px, ${currentRef.current.y - window.innerHeight / 2}px)`;
      }

      requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div
      ref={followerRef}
      className="fixed pointer-events-none -z-50 left-1/2 top-1/2"
    >
      {/* Outer glow - purple */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-400/5 blur-3xl animate-pulse"
        style={{ animationDuration: '3s' }}
      />

      {/* Middle glow - pink */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-pink-400/10 blur-2xl animate-pulse"
        style={{ animationDuration: '2s', animationDelay: '0.5s' }}
      />

      {/* Inner glow - blue */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-blue-400/15 blur-xl animate-pulse"
        style={{ animationDuration: '2.5s', animationDelay: '1s' }}
      />
    </div>
  );
}

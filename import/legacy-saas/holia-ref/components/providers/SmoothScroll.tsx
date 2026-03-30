"use client";

import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

const LENIS_OPTIONS = {
  lerp: 0.1,
  duration: 1.5,
};

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const rafRef = useRef<number>(0);
  const lenisRef = useRef<InstanceType<typeof Lenis> | null>(null);

  useEffect(() => {
    const lenis = new Lenis(LENIS_OPTIONS);
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    }
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <>{children}</>;
}

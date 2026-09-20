"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ParallaxSceneProps {
  children: React.ReactNode;
}

export function ParallaxScene({ children }: ParallaxSceneProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={sceneRef}
      className="relative h-screen w-full max-h-screen overflow-hidden bg-[#FAF6EE] text-[#2C1810] flex flex-col justify-between font-sans selection:bg-[#723C1A] selection:text-white"
    >
      {/* LAYER 1: DEEP BACKGROUND RETAIL SCENE WITH SOFT PARALLAX */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-transform duration-300 ease-out scale-105"
        style={{
          transform: `translate3d(${mousePos.x * -12}px, ${mousePos.y * -12}px, 0) scale(1.05)`,
        }}
      >
        <Image
          src="/image/04_HIGH_RES_RETAIL_BACKGROUND.png"
          alt="Retail Store Scene"
          fill
          priority
          quality={95}
          className="object-cover object-center filter brightness-[0.92] contrast-[1.05]"
        />
        {/* Ambient Warm Vignette & Center Soft Blur Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2C1810]/40 via-transparent to-[#2C1810]/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,246,238,0.45)_0%,rgba(44,24,16,0.55)_100%)] backdrop-blur-[2px]" />
      </div>

      {/* LAYER 2: INTERACTIVE CONTENT LAYER */}
      <div className="relative z-10 flex-1 flex flex-col justify-between h-full">
        {children}
      </div>
    </div>
  );
}

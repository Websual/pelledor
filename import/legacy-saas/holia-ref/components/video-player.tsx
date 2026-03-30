"use client";

import { useState, useRef, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import Image from "next/image";

interface VideoPlayerProps {
  src: string;
  alt: string;
  fallbackImage: string;
  fallbackWidth?: number;
  fallbackHeight?: number;
}

export function VideoPlayer({ src, alt, fallbackImage, fallbackWidth = 800, fallbackHeight = 600 }: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      ));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative group">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-auto"
      >
        <source src={src} type="video/mp4" />
        <Image
          src={fallbackImage}
          alt={alt}
          width={fallbackWidth}
          height={fallbackHeight}
          className="w-full h-auto"
        />
      </video>
      
      {/* Bouton fullscreen */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-2xl transition-colors opacity-0 group-hover:opacity-100 z-10"
        aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
      >
        {isFullscreen ? (
          <Minimize2 className="h-5 w-5 text-white" />
        ) : (
          <Maximize2 className="h-5 w-5 text-white" />
        )}
      </button>
    </div>
  );
}


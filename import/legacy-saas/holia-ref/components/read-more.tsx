"use client";

import { useState, useRef, useEffect } from "react";

interface ReadMoreProps {
  children: React.ReactNode;
  maxHeight?: number; // in pixels
  className?: string;
}

export function ReadMore({ children, maxHeight = 92, className = "" }: ReadMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      if (scrollHeight > maxHeight) {
        setNeedsToggle(true);
      }
    }
  }, [maxHeight]);

  return (
    <div className={`readmore-container overflow-hidden ${isExpanded ? "readmore-expanded" : ""} ${className}`}>
      <div
        ref={contentRef}
        className="readmore-content overflow-hidden"
        style={{
          maxHeight: isExpanded ? "none" : `${maxHeight}px`,
          transition: isExpanded ? "max-height 0.5s ease-in" : "max-height 0.4s ease-out",
          willChange: "max-height",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        {children}
      </div>
      {needsToggle && (
        <div className="readmore-toggle mt-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-medium underline transition-colors"
            aria-expanded={isExpanded}
            style={{
              color: "inherit",
            }}
          >
            {isExpanded ? "Lire moins" : "Lire la suite"}
          </button>
        </div>
      )}
    </div>
  );
}


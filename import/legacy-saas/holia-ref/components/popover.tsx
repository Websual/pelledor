"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PopoverProps {
  children: ReactNode;
  trigger: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
  side?: "top" | "bottom" | "auto";
  align?: "start" | "center" | "end";
  offset?: number;
}

export function Popover({
  children,
  trigger,
  isOpen,
  onClose,
  side = "auto",
  align = "center",
  offset = 4,
}: PopoverProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    side: "top" | "bottom";
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !trigger || !mounted) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!trigger || !popoverRef.current) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculer la hauteur estimée si pas encore rendu
      const estimatedHeight = popoverRect.height || 400;
      const popoverWidth = popoverRect.width || 384;

      // Déterminer le côté (haut ou bas)
      let finalSide: "top" | "bottom" = side === "auto" ? "bottom" : side;

      if (side === "auto") {
        // Calculer la position relative dans le viewport
        const triggerCenterY = triggerRect.top + triggerRect.height / 2;
        const viewportCenterY = viewportHeight / 2;
        const relativePosition = triggerCenterY / viewportHeight;

        // Calculer l'espace disponible
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        // Si on est dans le premier tiers du viewport (3 premières lignes approximatives), ouvrir vers le bas
        // Si on est dans le dernier tiers (2 dernières lignes approximatives), ouvrir vers le haut
        if (relativePosition < 0.3) {
          finalSide = "bottom";
        } else if (relativePosition > 0.7) {
          finalSide = "top";
        } else {
          // Sinon, choisir selon l'espace disponible
          finalSide = spaceBelow >= estimatedHeight || spaceBelow > spaceAbove ? "bottom" : "top";
        }
      }

      // Calculer la position verticale (offset = 0 pour ancrer directement à la case)
      let top: number;
      if (finalSide === "bottom") {
        top = triggerRect.bottom + offset;
        // Vérifier si ça dépasse, si oui, passer en haut
        if (top + estimatedHeight > viewportHeight - 16) {
          top = triggerRect.top - estimatedHeight - offset;
          finalSide = "top";
          // Si ça dépasse toujours, centrer verticalement
          if (top < 16) {
            top = Math.max(16, (viewportHeight - estimatedHeight) / 2);
          }
        }
      } else {
        top = triggerRect.top - estimatedHeight - offset;
        // Vérifier si ça dépasse, si oui, passer en bas
        if (top < 16) {
          top = triggerRect.bottom + offset;
          finalSide = "bottom";
          // Si ça dépasse toujours, centrer verticalement
          if (top + estimatedHeight > viewportHeight - 16) {
            top = Math.max(16, (viewportHeight - estimatedHeight) / 2);
          }
        }
      }

      // Calculer la position horizontale
      let left: number;
      if (align === "center") {
        left = triggerRect.left + triggerRect.width / 2;
        // S'assurer que la popover reste dans le viewport
        if (left - popoverWidth / 2 < 16) {
          left = popoverWidth / 2 + 16;
        } else if (left + popoverWidth / 2 > viewportWidth - 16) {
          left = viewportWidth - popoverWidth / 2 - 16;
        }
      } else if (align === "start") {
        left = triggerRect.left;
        if (left + popoverWidth > viewportWidth - 16) {
          left = viewportWidth - popoverWidth - 16;
        }
      } else {
        left = triggerRect.right - popoverWidth;
        if (left < 16) {
          left = 16;
        }
      }

      setPosition({ top, left, side: finalSide });
    };

    updatePosition();

    // Réécouter les changements de scroll et resize
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, trigger, side, align, offset, mounted]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-50 bg-white rounded-2xl shadow-xl p-6 max-w-sm w-[calc(100%-32px)] md:w-auto"
        style={{
          top: position?.top ? `${position.top}px` : "50%",
          left: position?.left ? `${position.left}px` : "50%",
          transform: position
            ? align === "center"
              ? "translateX(-50%)"
              : "none"
            : "translate(-50%, -50%)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );

  return createPortal(content, document.body);
}

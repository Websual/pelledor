"use client";

import { useEffect, RefObject } from "react";

/**
 * Appelle handler quand on clique en dehors de l'élément cible.
 * @param ref - Ref de l'élément principal (ex: conteneur de l'input)
 * @param handler - Callback appelé au clic extérieur
 * @param additionalRefs - Refs supplémentaires considérées comme "à l'intérieur" (ex: dropdown rendu via Portal)
 */
export function useOnClickOutside<T extends Node = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (e: MouseEvent | TouchEvent) => void,
  additionalRefs?: RefObject<T | null>[]
) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (additionalRefs?.some((r) => r.current?.contains(target))) return;
      handler(e);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, additionalRefs]);
}

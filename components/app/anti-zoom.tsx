"use client";

import { useEffect } from "react";

export function ZoomPrevention() {
  useEffect(() => {
    // Prevent pinch zoom
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // Apply touch-action CSS
    const style = document.createElement("style");
    style.textContent = `html, body { touch-action: pan-x pan-y; }`;
    document.head.appendChild(style);

    // Apply event listeners
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });

    // Cleanup
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.head.removeChild(style);
    };
  }, []);

  return null;
}

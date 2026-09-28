"use client";

import React, { useEffect, useState, useRef } from "react";

// Global loading event emitter
const EVENT_NAME = "levidrive_topbar_loading";

let activeRequestsCount = 0;

/**
 * Trigger the topbar loading bar to start trickling
 */
export function startTopbarLoading() {
  if (typeof window === "undefined") return;
  activeRequestsCount++;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action: "start", count: activeRequestsCount } }));
}

/**
 * Complete and dismiss the topbar loading bar
 */
export function stopTopbarLoading(force = false) {
  if (typeof window === "undefined") return;
  if (force) {
    activeRequestsCount = 0;
  } else {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action: "stop", count: activeRequestsCount } }));
}

export function TopbarProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleLoadingEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: "start" | "stop"; count: number }>;
      const { action, count } = customEvent.detail || { action: "stop", count: 0 };

      if (action === "start") {
        if (finishTimeoutRef.current) {
          clearTimeout(finishTimeoutRef.current);
          finishTimeoutRef.current = null;
        }

        setVisible(true);
        setProgress((prev) => (prev === 0 ? 18 : prev));

        // Start gradual trickling
        if (!timerRef.current) {
          timerRef.current = setInterval(() => {
            setProgress((prev) => {
              if (prev < 40) return prev + Math.random() * 8 + 4;
              if (prev < 70) return prev + Math.random() * 4 + 2;
              if (prev < 88) return prev + Math.random() * 1.5 + 0.5;
              return prev; // Stall smoothly below 90% until done
            });
          }, 200);
        }
      } else if (action === "stop") {
        if (count === 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // Rapidly finish to 100%
          setProgress(100);

          if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
          finishTimeoutRef.current = setTimeout(() => {
            setVisible(false);
            setTimeout(() => {
              setProgress(0);
            }, 300);
          }, 250);
        }
      }
    };

    window.addEventListener(EVENT_NAME, handleLoadingEvent);
    return () => {
      window.removeEventListener(EVENT_NAME, handleLoadingEvent);
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Background Track */}
      <div className="h-[2.5px] w-full bg-transparent overflow-hidden">
        {/* Animated Progress Bar */}
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 relative transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            boxShadow:
              "0 0 10px rgba(59, 130, 246, 0.7), 0 0 4px rgba(99, 102, 241, 0.5)",
          }}
        >
          {/* Glowing leading spark / head */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/40 blur-[2px] -mr-1" />
        </div>
      </div>
    </div>
  );
}

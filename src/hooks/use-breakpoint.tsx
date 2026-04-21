import { useEffect, useState } from "react";

/**
 * Returns true when viewport width is strictly less than `breakpoint` (px).
 * Defaults to 1024 → covers phones and tablets in portrait.
 */
export function useBreakpoint(breakpoint = 1024) {
  const [isBelow, setIsBelow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsBelow(window.innerWidth < breakpoint);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isBelow;
}
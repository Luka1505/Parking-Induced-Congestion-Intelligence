import { useMemo, useState } from "react";

export function useVirtualList<T>(items: T[], rowHeight: number, viewportHeight: number, overscan = 8) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);

  const visibleItems = useMemo(
    () =>
      items.slice(startIndex, endIndex).map((item, offset) => ({
        item,
        index: startIndex + offset,
        top: (startIndex + offset) * rowHeight,
      })),
    [endIndex, items, rowHeight, startIndex],
  );

  return { totalHeight, visibleItems, setScrollTop };
}

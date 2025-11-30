import { useState, useMemo, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollableCardsProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemWidth?: number; // Width of each card in pixels
  gap?: number; // Gap between cards in pixels
  itemsPerView?: number; // Number of items visible at once
  className?: string;
}

export function HorizontalScrollableCards<T extends { id: number | string }>({
  items,
  renderItem,
  itemWidth = 240,
  gap = 16,
  itemsPerView = 4,
  className = "",
}: HorizontalScrollableCardsProps<T>) {
  const [scrollIndex, setScrollIndex] = useState(0);

  // Calculate max scroll index to stop at the last visible item
  const maxScrollIndex = useMemo(() => {
    if (items.length <= itemsPerView) return 0;
    return Math.max(0, items.length - itemsPerView);
  }, [items.length, itemsPerView]);

  // Calculate transform distance (item width + gap)
  const scrollDistance = itemWidth + gap;

  // Adjust scroll index when items change (e.g., after removal)
  useEffect(() => {
    if (scrollIndex > maxScrollIndex) {
      setScrollIndex(maxScrollIndex);
    }
  }, [maxScrollIndex, scrollIndex]);

  const handlePrev = () => {
    setScrollIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setScrollIndex((prev) => Math.min(maxScrollIndex, prev + 1));
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`relative group/scrollable ${className}`}>
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(calc(-${scrollIndex} * ${scrollDistance}px))`,
          }}
        >
          {items.map((item, index) => (
            <div
              key={String(item.id)}
              className="flex-shrink-0"
              style={{ width: `${itemWidth}px`, marginRight: index < items.length - 1 ? `${gap}px` : 0 }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
      {items.length > itemsPerView && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={scrollIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-background/95 backdrop-blur-md border-2 border-border shadow-xl opacity-0 group-hover/scrollable:opacity-100 transition-all duration-200 z-20 hover:bg-background hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-7 h-7" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={scrollIndex >= maxScrollIndex}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-background/95 backdrop-blur-md border-2 border-border shadow-xl opacity-0 group-hover/scrollable:opacity-100 transition-all duration-200 z-20 hover:bg-background hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-7 h-7" />
          </Button>
        </>
      )}
    </div>
  );
}


import { useEffect, useRef, useCallback } from 'react';

interface UseDragAutoScrollOptions {
  enabled: boolean;
  scrollSpeed?: number;
  edgeSize?: number;
}

export const useDragAutoScroll = ({
  enabled,
  scrollSpeed = 10,
  edgeSize = 100
}: UseDragAutoScrollOptions) => {
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const mouseYRef = useRef(0);

  const scroll = useCallback(() => {
    if (!isDraggingRef.current) {
      return;
    }

    const viewportHeight = window.innerHeight;
    const mouseY = mouseYRef.current;

    let scrollAmount = 0;

    if (mouseY < edgeSize) {
      const intensity = 1 - (mouseY / edgeSize);
      scrollAmount = -scrollSpeed * intensity;
    } else if (mouseY > viewportHeight - edgeSize) {
      const intensity = (mouseY - (viewportHeight - edgeSize)) / edgeSize;
      scrollAmount = scrollSpeed * intensity;
    }

    if (scrollAmount !== 0) {
      window.scrollBy(0, scrollAmount);
    }

    animationFrameRef.current = requestAnimationFrame(scroll);
  }, [scrollSpeed, edgeSize]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleDragStart = () => {
      isDraggingRef.current = true;
      scroll();
    };

    const handleDragOver = (e: DragEvent) => {
      mouseYRef.current = e.clientY;
    };

    const handleDragEnd = () => {
      isDraggingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, [enabled, scroll]);

  return null;
};

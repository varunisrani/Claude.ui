import { useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance for swipe
  edgeThreshold?: number; // Max distance from edge for edge swipes
  enabled?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  edgeThreshold = 30,
  enabled = true,
}: SwipeGestureOptions) {
  const touchState = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };
    },
    [enabled],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchState.current) return;

      const touch = e.changedTouches[0];
      const { startX, startY, startTime } = touchState.current;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const deltaTime = Date.now() - startTime;

      // Only consider horizontal swipes (more horizontal than vertical)
      if (Math.abs(deltaX) < Math.abs(deltaY)) {
        touchState.current = null;
        return;
      }

      // Check if swipe was fast enough (within 300ms) and long enough
      if (deltaTime < 300 && Math.abs(deltaX) > threshold) {
        // Swipe right (open sidebar) - only from left edge
        if (deltaX > 0 && startX < edgeThreshold && onSwipeRight) {
          onSwipeRight();
        }
        // Swipe left (close sidebar) - from anywhere
        else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      touchState.current = null;
    },
    [enabled, threshold, edgeThreshold, onSwipeLeft, onSwipeRight],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchEnd]);
}

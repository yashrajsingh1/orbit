/**
 * ORBIT Gesture Hook
 * 
 * Mobile-first gesture recognition for intuitive interactions.
 * Philosophy: Gestures should feel natural, not forced.
 */

import { useRef, useEffect, useCallback } from 'react';

export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
}

interface GestureState {
  startX: number;
  startY: number;
  startTime: number;
  isTracking: boolean;
  initialDistance: number | null;
}

const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
const SWIPE_VELOCITY = 0.3; // Minimum velocity (px/ms)
const LONG_PRESS_DURATION = 500; // ms
const DOUBLE_TAP_DELAY = 300; // ms

export function useGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: GestureHandlers,
  options: {
    enabled?: boolean;
    preventDefault?: boolean;
  } = {}
) {
  const { enabled = true, preventDefault = true } = options;
  
  const stateRef = useRef<GestureState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
    initialDistance: null,
  });
  
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef<number>(0);

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    const now = Date.now();
    
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      isTracking: true,
      initialDistance: e.touches.length === 2 
        ? getDistance(e.touches[0], e.touches[1]) 
        : null,
    };

    // Double tap detection
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      handlers.onDoubleTap?.();
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }

    // Long press detection
    if (handlers.onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (stateRef.current.isTracking) {
          handlers.onLongPress?.();
          stateRef.current.isTracking = false;
        }
      }, LONG_PRESS_DURATION);
    }
  }, [enabled, handlers]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !stateRef.current.isTracking) return;
    
    if (preventDefault) {
      // Only prevent default for significant movements
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - stateRef.current.startX);
      const dy = Math.abs(touch.clientY - stateRef.current.startY);
      
      if (dx > 10 || dy > 10) {
        e.preventDefault();
      }
    }

    // Clear long press if moved
    if (longPressTimer.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - stateRef.current.startX);
      const dy = Math.abs(touch.clientY - stateRef.current.startY);
      
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    // Pinch detection
    if (e.touches.length === 2 && stateRef.current.initialDistance !== null) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const ratio = currentDistance / stateRef.current.initialDistance;
      
      if (ratio > 1.5) {
        handlers.onPinchOut?.();
        stateRef.current.isTracking = false;
      } else if (ratio < 0.67) {
        handlers.onPinchIn?.();
        stateRef.current.isTracking = false;
      }
    }
  }, [enabled, preventDefault, handlers]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!stateRef.current.isTracking) return;
    stateRef.current.isTracking = false;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - stateRef.current.startX;
    const dy = touch.clientY - stateRef.current.startY;
    const dt = Date.now() - stateRef.current.startTime;
    
    // Check for swipe
    const vx = Math.abs(dx) / dt;
    const vy = Math.abs(dy) / dt;
    
    const isHorizontalSwipe = Math.abs(dx) > SWIPE_THRESHOLD && vx > SWIPE_VELOCITY;
    const isVerticalSwipe = Math.abs(dy) > SWIPE_THRESHOLD && vy > SWIPE_VELOCITY;

    // Prioritize the dominant direction
    if (isHorizontalSwipe && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        handlers.onSwipeRight?.();
      } else {
        handlers.onSwipeLeft?.();
      }
    } else if (isVerticalSwipe) {
      if (dy > 0) {
        handlers.onSwipeDown?.();
      } else {
        handlers.onSwipeUp?.();
      }
    }
  }, [enabled, handlers]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const options: AddEventListenerOptions = { passive: !preventDefault };

    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);
}

/**
 * Hook for drag gestures (desktop and mobile)
 */
export function useDrag(
  elementRef: React.RefObject<HTMLElement>,
  onDrag: (delta: { x: number; y: number }) => void,
  onDragEnd?: () => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    const handleStart = (clientX: number, clientY: number) => {
      isDragging.current = true;
      lastPos.current = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging.current) return;
      
      const delta = {
        x: clientX - lastPos.current.x,
        y: clientY - lastPos.current.y,
      };
      
      lastPos.current = { x: clientX, y: clientY };
      onDrag(delta);
    };

    const handleEnd = () => {
      if (isDragging.current) {
        isDragging.current = false;
        onDragEnd?.();
      }
    };

    // Mouse events
    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => handleEnd();

    element.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    element.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      element.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [elementRef, enabled, onDrag, onDragEnd]);

  return { isDragging: isDragging.current };
}

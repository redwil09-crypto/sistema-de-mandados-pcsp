
import { useEffect, useRef } from 'react';

interface SwipeHandlers {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
}

export const useSwipe = ({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }: SwipeHandlers) => {
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const touchEnd = useRef<{ x: number, y: number } | null>(null);

    // Minimum swipe distance (px)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        // Ignore swipes starting from the very edge (allow OS Back Gesture)
        const startX = e.targetTouches[0].clientX;
        const screenWidth = window.innerWidth;

        // Edge Guard: 30px from left or right
        if (startX < 30 || startX > screenWidth - 30) {
            touchStart.current = null;
            return;
        }

        touchEnd.current = null; // Reset
        touchStart.current = {
            x: startX,
            y: e.targetTouches[0].clientY
        };
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        };
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;

        const distanceX = touchStart.current.x - touchEnd.current.x;
        const distanceY = touchStart.current.y - touchEnd.current.y;
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;
        const isUpSwipe = distanceY > minSwipeDistance;
        const isDownSwipe = distanceY < -minSwipeDistance;

        // Determine if horizontal or vertical swipe dominates
        if (Math.abs(distanceX) > Math.abs(distanceY)) {
            // Horizontal
            if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
            if (isRightSwipe && onSwipeRight) onSwipeRight();
        } else {
            // Vertical
            if (isUpSwipe && onSwipeUp) onSwipeUp();
            if (isDownSwipe && onSwipeDown) onSwipeDown();
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
};

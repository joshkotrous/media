"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface StickyScrollSectionProps {
  children: ReactNode;
  className?: string;
}

export default function StickyScrollSection({ 
  children, 
  className = "" 
}: StickyScrollSectionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure content height
  useEffect(() => {
    const updateHeight = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.offsetHeight);
      }
    };
    
    updateHeight();
    window.addEventListener("resize", updateHeight);
    
    // Observe content size changes (images loading, etc.)
    const observer = new ResizeObserver(updateHeight);
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }
    
    return () => {
      window.removeEventListener("resize", updateHeight);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!wrapperRef.current || !contentRef.current || contentHeight === 0) return;

      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Content should become fixed when:
      // - The bottom of the content would be at or above the bottom of the viewport
      // - And the top of the wrapper is above the viewport (we've scrolled into it)
      const contentBottomFromViewportTop = wrapperRect.top + contentHeight;
      const shouldFix = contentBottomFromViewportTop <= viewportHeight && wrapperRect.top <= 0;

      setIsFixed(shouldFix);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [contentHeight]);

  // Calculate the fixed position (content bottom at viewport bottom)
  const fixedTop = isFixed ? window.innerHeight - contentHeight : 0;

  return (
    <div 
      ref={wrapperRef} 
      className={className}
      style={{ height: contentHeight > 0 ? contentHeight : "auto" }}
    >
      <div
        ref={contentRef}
        style={{
          position: isFixed ? "fixed" : "relative",
          top: isFixed ? Math.min(fixedTop, 0) : "auto",
          left: 0,
          width: "100%",
          maxWidth: "100vw",
          overflowX: "hidden",
          zIndex: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

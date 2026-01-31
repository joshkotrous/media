"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import PhotoCard from "./PhotoCard";
import type { PhotoData } from "../page";

interface PhotoGridProps {
  photos: PhotoData[];
}

export default function PhotoGrid({ photos }: PhotoGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const openLightbox = (index: number) => {
    setIsImageLoaded(false);
    setSelectedIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedIndex(null);
      setIsClosing(false);
    }, 200);
  }, []);

  const goToPrevious = useCallback(() => {
    if (selectedIndex === null) return;
    setIsImageLoaded(false);
    setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
  }, [selectedIndex, photos.length]);

  const goToNext = useCallback(() => {
    if (selectedIndex === null) return;
    setIsImageLoaded(false);
    setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1);
  }, [selectedIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex, goToPrevious, goToNext, closeLightbox]);

  return (
    <>
      {/* Photo Grid */}
      <div className="photo-grid">
        {photos.map((photo, index) => (
          <div key={photo.file} onClick={() => openLightbox(index)}>
            <PhotoCard
              src={`/photos/${photo.file}`}
              alt={`Photo ${index + 1}`}
              priority={index < 6}
            />
          </div>
        ))}
      </div>

      {/* Lightbox Overlay */}
      {selectedIndex !== null && (
        <div
          className={`fixed inset-0 z-50 bg-black/95 flex items-center justify-center transition-opacity duration-200 ${
            isClosing ? "opacity-0" : "opacity-100"
          }`}
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 md:left-8 text-white/70 hover:text-white transition-colors z-10 p-2"
            aria-label="Previous photo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 md:right-8 text-white/70 hover:text-white transition-colors z-10 p-2"
            aria-label="Next photo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Image Container */}
          <div
            className="flex items-center justify-center w-full h-full px-4 sm:px-12 md:px-24 py-12 md:py-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative w-full h-full max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-6rem)] md:max-w-[calc(100vw-10rem)] max-h-[calc(100vh-6rem)] md:max-h-[calc(100vh-8rem)]"
              style={{
                aspectRatio: `${photos[selectedIndex].width} / ${photos[selectedIndex].height}`,
              }}
            >
              {/* Skeleton */}
              {!isImageLoaded && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
              )}
              <Image
                src={`/photos/${photos[selectedIndex].file}`}
                alt={`Photo ${selectedIndex + 1}`}
                fill
                className={`transition-opacity duration-300 ${
                  isImageLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{ objectFit: "contain" }}
                sizes="90vw"
                priority
                onLoad={() => setIsImageLoaded(true)}
                draggable={false}
              />
            </div>
          </div>

          {/* Photo Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm tracking-wide">
            {selectedIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

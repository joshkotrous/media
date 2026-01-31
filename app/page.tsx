import Image from "next/image";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import PhotoGrid from "./components/PhotoGrid";
import StickyScrollSection from "./components/StickyScrollSection";

type ColorData = {
  h: number;
  s: number;
  l: number;
};

function rgbToHsl(r: number, g: number, b: number): ColorData {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export type PhotoData = {
  file: string;
  width: number;
  height: number;
};

async function getPhotosSortedByColor(): Promise<PhotoData[]> {
  const photosDir = path.join(process.cwd(), "public/photos");
  const files = fs
    .readdirSync(photosDir)
    .filter((file) => /\.webp$/i.test(file));

  // Extract dominant color and dimensions from each image
  const photosWithData = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(photosDir, file);
      const image = sharp(filePath);
      const [{ dominant }, metadata] = await Promise.all([
        image.stats(),
        image.metadata(),
      ]);
      const color = rgbToHsl(dominant.r, dominant.g, dominant.b);
      return {
        file,
        color,
        width: metadata.width || 1,
        height: metadata.height || 1,
      };
    })
  );

  // Sort by lightness group, then hue, then saturation
  return photosWithData
    .sort((a, b) => {
      const colorA = a.color;
      const colorB = b.color;

      // Group by lightness first (dark, mid, light)
      const lightnessGroupA = colorA.l < 20 ? 0 : colorA.l > 80 ? 2 : 1;
      const lightnessGroupB = colorB.l < 20 ? 0 : colorB.l > 80 ? 2 : 1;
      if (lightnessGroupA !== lightnessGroupB)
        return lightnessGroupA - lightnessGroupB;

      // Within each group, sort by hue
      if (Math.abs(colorA.h - colorB.h) > 10) return colorA.h - colorB.h;

      // Then by saturation
      if (Math.abs(colorA.s - colorB.s) > 10) return colorB.s - colorA.s;

      // Finally by lightness
      return colorA.l - colorB.l;
    })
    .map((p) => ({ file: p.file, width: p.width, height: p.height }));
}

export default async function Home() {
  const photos = await getPhotosSortedByColor();

  return (
    <main>
      {/* Fixed Hero Background */}
      <div className="hero-fixed">
        {/* Background Image */}
        <Image
          src="/photos/5.26.19-3.webp"
          alt="Background"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Content */}
        <div className="relative h-full w-full flex flex-col items-center justify-center px-8">
          <h1 className="text-[#1a1a1a] text-5xl md:text-7xl lg:text-8xl tracking-tight text-center leading-tight">
            Media
          </h1>
          <p className="text-[#1a1a1a]/60 text-lg md:text-xl mt-6 tracking-wide italic">
            by Josh Kotrous
          </p>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-[1px] h-16 bg-[#1a1a1a]/30 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Selected Works Section - becomes fixed when scrolled to bottom */}
      <StickyScrollSection className="scroll-wrapper">
        <div className="scroll-content">
          <div className="px-4 sm:px-6 md:px-12 lg:px-20 py-12 md:py-24">
            {/* Section Header */}
            <div className="max-w-2xl mb-16">
              <h2 className="text-3xl md:text-4xl text-[#1a1a1a] mb-4">
                Selected Works
              </h2>
              <p className="text-[#1a1a1a]/60 text-lg leading-relaxed">
                A personal collection from years of casual shooting.
              </p>
            </div>

            {/* Photo Grid with Lightbox */}
            <PhotoGrid photos={photos} />
          </div>
        </div>
      </StickyScrollSection>

      {/* Videos Section - Scrolls over Selected Works */}
      <div className="videos-section">
        <div className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
          {/* Section Header */}
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-4xl text-[#1a1a1a] mb-4">Videos</h2>
            <p className="text-[#1a1a1a]/60 text-lg leading-relaxed">
              Motion work and video projects.
            </p>
          </div>

          {/* Video Embeds */}
          <div className="video-grid space-y-6">
            <div className="video-container">
              <iframe
                src="https://www.youtube.com/embed/xNoOG3FzMA4"
                title="Video 1"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="video-container">
              <iframe
                src="https://www.youtube.com/embed/bY_oveB7L9c"
                title="Video 2"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="video-container">
              <iframe
                src="https://www.youtube.com/embed/FMZ6bA3m_9A"
                title="Video 3"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="video-container">
              <iframe
                src="https://www.youtube.com/embed/ewjtF2XSzfw"
                title="Video 4"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

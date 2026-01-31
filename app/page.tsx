import Image from "next/image";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import PhotoCard from "./components/PhotoCard";

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

async function getPhotosSortedByColor() {
  const photosDir = path.join(process.cwd(), "public/photos");
  const files = fs
    .readdirSync(photosDir)
    .filter((file) => /\.webp$/i.test(file));

  // Extract dominant color from each image
  const photosWithColors = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(photosDir, file);
      const { dominant } = await sharp(filePath).stats();
      const color = rgbToHsl(dominant.r, dominant.g, dominant.b);
      return { file, color };
    })
  );

  // Sort by lightness group, then hue, then saturation
  return photosWithColors
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
    .map((p) => p.file);
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

      {/* Scrolling Content Section */}
      <div className="scroll-content">
        <div className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
          {/* Section Header */}
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-4xl text-[#1a1a1a] mb-4">
              Selected Works
            </h2>
            <p className="text-[#1a1a1a]/60 text-lg leading-relaxed">
              A personal collection from years of casual shooting.
            </p>
          </div>

          {/* Photo Grid */}
          <div className="photo-grid">
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo}
                src={`/photos/${photo}`}
                alt={`Photo ${index + 1}`}
                priority={index < 6}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

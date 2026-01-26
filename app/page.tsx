import Image from "next/image";
import fs from "fs";
import path from "path";
import sharp from "sharp";

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
  const files = fs.readdirSync(photosDir).filter((file) => /\.webp$/i.test(file));

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
      if (lightnessGroupA !== lightnessGroupB) return lightnessGroupA - lightnessGroupB;

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
      {/* Hero Section */}
      <div className="relative h-screen w-full">
        <Image
          src="/photos/4.8.19-17.webp"
          alt="Hero"
          fill
          priority
          unoptimized
          className="object-cover"
        />
      </div>

      {/* Photo Grid */}
      <div className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo}
              className="relative aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={`/photos/${photo}`}
                alt={photo}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

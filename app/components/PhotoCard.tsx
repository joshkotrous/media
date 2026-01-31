import Image from "next/image";

interface PhotoCardProps {
  src: string;
  alt: string;
  priority?: boolean;
}

export default function PhotoCard({ src, alt, priority = false }: PhotoCardProps) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer [content-visibility:auto] [contain-intrinsic-size:auto_50vw] sm:[contain-intrinsic-size:auto_300px] w-full min-w-0 max-w-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-400 ease-out will-change-transform group-hover:scale-[1.03]"
        loading={priority ? "eager" : "lazy"}
        priority={priority}
      />
    </div>
  );
}

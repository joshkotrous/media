import Image from "next/image";

interface PhotoCardProps {
  src: string;
  alt: string;
  priority?: boolean;
}

export default function PhotoCard({ src, alt, priority = false }: PhotoCardProps) {
  return (
    <div className="photo-card relative aspect-square overflow-hidden rounded-lg cursor-pointer">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        loading={priority ? "eager" : "lazy"}
        priority={priority}
      />
    </div>
  );
}

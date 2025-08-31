import React from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImageProps, "src"> {
  src: string;
  fallbackSrc?: string;
  lazy?: boolean;
  blur?: boolean;
  quality?: number;
  formats?: ("webp" | "avif")[];
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  lazy = true,
  blur = true,
  quality = 75,
  formats = ["webp", "avif"],
  className,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Generate srcSet for different formats
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc.startsWith("http") && !baseSrc.startsWith("/")) {
      return baseSrc;
    }

    const srcSets = formats.map((format) => {
      const url = new URL(baseSrc, window.location.origin);
      url.searchParams.set("format", format);
      url.searchParams.set("quality", quality.toString());
      return `${url.toString()} 1x`;
    });

    return srcSets.join(", ");
  };

  // Fallback to regular img if Next.js Image fails
  if (error && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={cn("object-cover", className)}
        onError={handleError}
        onLoad={handleLoad}
        loading={lazy ? "lazy" : "eager"}
        {...(props as any)}
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && blur && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      <Image
        src={src}
        alt={alt}
        quality={quality}
        loading={lazy ? "lazy" : "eager"}
        onError={handleError}
        onLoad={handleLoad}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />
    </div>
  );
}

// Progressive image loading component
export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className,
  ...props
}: {
  src: string;
  placeholder?: string;
  alt: string;
  className?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || "");
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          "transition-all duration-500",
          !isLoaded && placeholder ? "blur-sm scale-110" : "blur-0 scale-100",
          className
        )}
        {...props}
      />

      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}

// Avatar with optimized loading
export function OptimizedAvatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = React.useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleError = () => setError(true);

  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gray-500 text-white font-medium",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={`${name} avatar`}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      onError={handleError}
      quality={90}
    />
  );
}

// Responsive image with multiple breakpoints
export function ResponsiveImage({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  className,
  ...props
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
} & Omit<ImageProps, "src" | "alt" | "sizes">) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      sizes={sizes}
      className={className}
      fill
      style={{ objectFit: "cover" }}
      {...props}
    />
  );
}

// Image gallery with lazy loading
export function ImageGallery({
  images,
  columns = 3,
  gap = 4,
  className,
}: {
  images: Array<{ src: string; alt: string; caption?: string }>;
  columns?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {images.map((image, index) => (
        <div key={index} className="relative group">
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            width={400}
            height={300}
            className="w-full h-auto rounded-lg transition-transform group-hover:scale-105"
            lazy={index > 6} // Load first 6 images immediately
          />

          {image.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-sm">{image.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

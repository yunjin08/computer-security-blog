"use client";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

export function ContentImage({ src, alt = "", className }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const el = e.currentTarget;
        el.style.background = "#e5e5e5";
        el.style.minHeight = "80px";
        el.onerror = null;
        el.removeAttribute("src");
      }}
    />
  );
}

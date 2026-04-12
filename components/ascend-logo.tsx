"use client";

import Image from "next/image";

type Props = {
  /** Square asset; displayed in a circle. */
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function AscendLogo({ size = 40, className = "", priority = false }: Props) {
  return (
    <Image
      src="/ascend-logo.png"
      alt="Ascend"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 rounded-full object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

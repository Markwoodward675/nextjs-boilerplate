"use client";

import Image from "next/image";
import { useState } from "react";

export default function BrandLogo({ size = 36 }) {
  const [src, setSrc] = useState("/icon.png");

  return (
    <Image
      src={src}
      alt="Day Trader"
      width={size}
      height={size}
      priority
      onError={() => setSrc("/favicon-32x32.png")}
    />
  );
}

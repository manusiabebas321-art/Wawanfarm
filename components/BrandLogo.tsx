"use client";

import { useState } from "react";

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 36, className = "" }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary shadow-sm flex-shrink-0 ${className}`}
      >
        <span className="material-symbols-outlined text-[20px]">potted_plant</span>
      </div>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="WawanFarm Logo"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`rounded-xl object-cover shadow-sm flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

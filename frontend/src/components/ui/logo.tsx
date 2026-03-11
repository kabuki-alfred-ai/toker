import React from 'react';
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'text';
  color?: 'primary' | 'white' | 'black';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  variant = 'full',
  color = 'primary'
}) => {
  const textColor = {
    primary: 'text-[#F05800]',
    white: 'text-white',
    black: 'text-black'
  }[color];

  // The rings are always dark/neutral regardless of color prop (like in the reference)
  const ringColor = '#2A1F3D';

  const iconPart = (
    <svg
      width="40"
      height="34"
      viewBox="0 0 40 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(variant === 'icon' ? "h-8 w-8" : "h-8 w-auto")}
    >
      {/* Small back circle — deepest, top-left */}
      <circle cx="7" cy="8" r="5.5" stroke={ringColor} strokeWidth="1.2" strokeOpacity="0.3" />
      {/* Medium circle — mid-depth */}
      <circle cx="13" cy="14" r="9" stroke={ringColor} strokeWidth="1.35" strokeOpacity="0.6" />
      {/* Large front circle — bottom-right, front */}
      <circle cx="21" cy="20" r="13" stroke={ringColor} strokeWidth="1.5" />
    </svg>
  );

  if (variant === 'icon') return iconPart;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {variant === 'full' && iconPart}
      {(variant === 'full' || variant === 'text') && (
        <span className={cn("text-2xl font-medium tracking-wide leading-none pt-0.5 font-albert", textColor)}>
          Toker
        </span>
      )}
    </div>
  );
};

import React from 'react';

interface AlignaLogoProps {
  className?: string;
  size?: number;
  iconOnly?: boolean;
  color?: string; // Icon fill color, defaults to pitch deck forest green (#0c331d)
  textColor?: string;
  squareBadge?: boolean; // When true, presents the icon in a sleek square badge
}

export const AlignaLogo: React.FC<AlignaLogoProps> = ({
  className = '',
  size = 36,
  iconOnly = false,
  color = '#0c331d',
  textColor = '#0c331d',
  squareBadge = true,
}) => {
  // Official Aligna brand mark in precise 1:1 square geometry
  const svgIcon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 aspect-square"
      aria-label="Aligna Logo"
    >
      <path
        d="M 72 415 C 70 380, 75 320, 120 285 C 145 265, 175 270, 195 295 C 210 315, 215 330, 225 335 C 200 310, 175 275, 155 240 C 135 205, 130 175, 150 140 C 175 100, 215 85, 265 85 C 315 85, 355 110, 380 155 C 405 200, 420 280, 430 380 C 432 405, 425 415, 410 415 L 340 415 C 325 415, 320 405, 315 380 C 295 280, 275 210, 260 170 C 255 155, 245 155, 240 168 C 230 195, 228 235, 235 270 C 242 305, 260 335, 280 355 C 290 365, 290 375, 280 380 C 270 385, 250 380, 230 365 C 210 350, 195 355, 185 375 C 175 395, 160 415, 140 415 L 72 415 Z"
        fill={color}
      />
    </svg>
  );

  const iconElement = squareBadge ? (
    <div className="aspect-square flex items-center justify-center rounded-xl bg-white border border-[#e8e4d3] shadow-2xs p-1">
      {svgIcon}
    </div>
  ) : (
    svgIcon
  );

  if (iconOnly) {
    return <div className={`inline-flex items-center ${className}`}>{iconElement}</div>;
  }

  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {iconElement}
      <span
        className="font-serif text-2xl font-bold tracking-tight select-none"
        style={{ color: textColor, fontFamily: "'Lora', 'Newsreader', Georgia, serif" }}
      >
        Aligna
      </span>
    </div>
  );
};

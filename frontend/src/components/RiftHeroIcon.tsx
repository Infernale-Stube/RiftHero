import React from 'react';

interface RiftHeroIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * RiftHero Iconic Crest
 * Inspired by League of Legends Hextech craftsmanship, Challenger/Grandmaster crests,
 * and the fiery dimensional Rift crystal.
 */
export default function RiftHeroIcon({ className = 'w-6 h-6', size, ...props }: RiftHeroIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <defs>
        {/* Metallic Gold Primary Gradient */}
        <linearGradient id="rh-gold-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2A3" />
          <stop offset="30%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Metallic Gold Highlight Gradient */}
        <linearGradient id="rh-gold-light" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Deep Shaded Gold / Bronze */}
        <linearGradient id="rh-gold-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="60%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>

        {/* Central Rift Shard Core Glow Gradient */}
        <linearGradient id="rh-rift-core" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#FEF08A" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Dark Obsidian Inlay */}
        <radialGradient id="rh-obsidian" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1E232F" />
          <stop offset="65%" stopColor="#0E121B" />
          <stop offset="100%" stopColor="#05070B" />
        </radialGradient>

        {/* Dynamic Energy Aura Glow */}
        <radialGradient id="rh-aura-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#EA580C" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>

        {/* Filter for subtle magical bloom */}
        <filter id="rh-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Atmospheric Background Glow */}
      <circle cx="50" cy="50" r="42" fill="url(#rh-aura-glow)" />

      {/* Outer Aegis / Crest Silhouette (Obsidian Base) */}
      <path
        d="M50 8 
           L74 18 
           L84 32 
           L79 48 
           L85 64 
           L70 80 
           L50 94 
           L30 80 
           L15 64 
           L21 48 
           L16 32 
           L26 18 Z"
        fill="url(#rh-obsidian)"
        stroke="url(#rh-gold-dark)"
        strokeWidth="1.5"
      />

      {/* Left Outer Wing Armor Plate (LoL Hextech Wing) */}
      <path
        d="M50 11 L28 20 L20 32 L24 46 L17 62 L32 77 L50 90 L50 84 L36 72 L25 58 L28 46 L23 35 L33 24 L50 16 Z"
        fill="url(#rh-gold-dark)"
      />

      {/* Right Outer Wing Armor Plate */}
      <path
        d="M50 11 L72 20 L80 32 L76 46 L83 62 L68 77 L50 90 L50 84 L64 72 L75 58 L72 46 L77 35 L67 24 L50 16 Z"
        fill="url(#rh-gold-primary)"
      />

      {/* Upper Crown Spire & Wing Highlights */}
      <path
        d="M50 8 L60 17 L50 25 L40 17 Z"
        fill="url(#rh-gold-light)"
      />
      <path
        d="M50 8 L50 25 L40 17 Z"
        fill="url(#rh-gold-primary)"
      />

      {/* Upper Wing Flanges (Left & Right) */}
      <path
        d="M28 20 L38 27 L33 36 L20 32 Z"
        fill="url(#rh-gold-primary)"
      />
      <path
        d="M72 20 L62 27 L67 36 L80 32 Z"
        fill="url(#rh-gold-light)"
      />

      {/* Mid Shield Beveled Flanges */}
      <path
        d="M24 46 L36 49 L32 64 L17 62 Z"
        fill="url(#rh-gold-dark)"
      />
      <path
        d="M76 46 L64 49 L68 64 L83 62 Z"
        fill="url(#rh-gold-primary)"
      />

      {/* Inner Crest Frame (Chiseled Gold Inset) */}
      <path
        d="M50 26 
           L66 38 
           L62 60 
           L50 78 
           L38 60 
           L34 38 Z"
        fill="#090D15"
        stroke="url(#rh-gold-primary)"
        strokeWidth="1.75"
      />

      {/* Inner Bevel Shadow (Left Facet) */}
      <path
        d="M50 27 L35 39 L39 59 L50 76 Z"
        fill="black"
        fillOpacity="0.4"
      />

      {/* Central Floating Nexus Shard / Rift Crystal */}
      {/* Outer Shard Glow */}
      <polygon
        points="50,30 60,49 50,71 40,49"
        fill="url(#rh-rift-core)"
        opacity="0.3"
        filter="url(#rh-glow-filter)"
      />

      {/* Left Shard Facet (Warm Amber Flame) */}
      <polygon
        points="50,31 41,49 50,70"
        fill="#F97316"
      />

      {/* Right Shard Facet (Bright Specular Gold) */}
      <polygon
        points="50,31 59,49 50,70"
        fill="url(#rh-rift-core)"
      />

      {/* Inner Shard High-Intensity Core Diamond */}
      <polygon
        points="50,36 55,49 50,62 45,49"
        fill="#FFFBEB"
        opacity="0.9"
      />

      {/* Dimensional Rift Crack / Lightning Spark */}
      <path
        d="M50 33 L49 43 L52 48 L48 56 L51 61 L50 67"
        stroke="#FFFFFF"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Lower Apex Fang (Runeterra Demacia/Piltover Gold Finial) */}
      <polygon
        points="50,75 56,84 50,91 44,84"
        fill="url(#rh-gold-light)"
      />
      <polygon
        points="50,75 44,84 50,91"
        fill="url(#rh-gold-dark)"
      />

      {/* Top Nexus Core Crown Gem */}
      <circle cx="50" cy="17" r="2.5" fill="#FFFBEB" />
      <circle cx="50" cy="17" r="1.2" fill="#F97316" />
    </svg>
  );
}

import React from 'react';

interface RiftHeroIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * RiftHero Challenger Wings Emblem (Frameless)
 * Pure soaring metallic wings with a blazing dimensional Rift crystal core.
 * Inspired by League of Legends Challenger rank crest & Summoner's Cup iconography.
 */
export default function RiftHeroIcon({ className = 'w-8 h-8', size, ...props }: RiftHeroIconProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <defs>
        {/* Bright Specular Gold (Light hitting metallic edges) */}
        <linearGradient id="cw-gold-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="75%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Primary Rich Gold / Bronze */}
        <linearGradient id="cw-gold-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="80%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Shaded Chiseled Gold (Underside of wing blades) */}
        <linearGradient id="cw-gold-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="50%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>

        {/* Deep Dark Obsidian Steel (Blade inlays & depth) */}
        <linearGradient id="cw-steel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#27272A" />
          <stop offset="60%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#09090B" />
        </linearGradient>

        {/* Blazing Rift Core Energy */}
        <linearGradient id="cw-rift-fire" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#FEF08A" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>

        {/* Radial Core Energy Burst */}
        <radialGradient id="cw-core-burst" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#F97316" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
        </radialGradient>

        {/* Filter for glowing crystal bloom */}
        <filter id="cw-bloom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Atmospheric Core Glow Burst between wings */}
      <circle cx="60" cy="58" r="32" fill="url(#cw-core-burst)" />

      {/* ================= LEFT WING SYSTEM ================= */}

      {/* Left Upper Wing Primary Blade - Dark Underlay */}
      <path
        d="M60 48 L46 38 L22 18 C16 28 14 42 24 54 L44 58 L60 48 Z"
        fill="url(#cw-steel)"
      />
      {/* Left Upper Wing Primary Blade - Gold Armor Facet */}
      <path
        d="M60 48 L46 38 L22 18 C26 12 38 18 48 28 L60 40 Z"
        fill="url(#cw-gold-highlight)"
      />
      {/* Left Upper Wing Outer Razor Feather */}
      <path
        d="M48 28 L22 18 C14 26 12 40 18 52 L32 50 C24 38 32 28 48 28 Z"
        fill="url(#cw-gold-body)"
      />

      {/* Left Middle Wing Blade (Sweeping Outward) */}
      <path
        d="M60 62 L42 58 L12 48 C8 58 10 70 20 80 L38 72 L54 66 Z"
        fill="url(#cw-gold-shadow)"
      />
      <path
        d="M56 60 L38 56 L12 48 C16 44 26 48 38 52 L54 62 Z"
        fill="url(#cw-gold-highlight)"
      />
      <path
        d="M42 58 L12 48 C14 62 24 74 36 74 L46 64 Z"
        fill="url(#cw-gold-body)"
      />

      {/* Left Lower Wing Flange (Anchoring Claw) */}
      <path
        d="M60 76 L48 70 L26 80 C32 90 42 98 56 102 L60 88 Z"
        fill="url(#cw-gold-shadow)"
      />
      <path
        d="M58 74 L46 68 L26 80 C34 84 46 84 56 80 Z"
        fill="url(#cw-gold-highlight)"
      />

      {/* ================= RIGHT WING SYSTEM (SYMMETRICAL) ================= */}

      {/* Right Upper Wing Primary Blade - Dark Underlay */}
      <path
        d="M60 48 L74 38 L98 18 C104 28 106 42 96 54 L76 58 L60 48 Z"
        fill="url(#cw-steel)"
      />
      {/* Right Upper Wing Primary Blade - Gold Armor Facet */}
      <path
        d="M60 48 L74 38 L98 18 C94 12 82 18 72 28 L60 40 Z"
        fill="url(#cw-gold-highlight)"
      />
      {/* Right Upper Wing Outer Razor Feather */}
      <path
        d="M72 28 L98 18 C106 26 108 40 102 52 L88 50 C96 38 88 28 72 28 Z"
        fill="url(#cw-gold-body)"
      />

      {/* Right Middle Wing Blade (Sweeping Outward) */}
      <path
        d="M60 62 L78 58 L108 48 C112 58 110 70 100 80 L82 72 L66 66 Z"
        fill="url(#cw-gold-shadow)"
      />
      <path
        d="M64 60 L82 56 L108 48 C104 44 94 48 82 52 L66 62 Z"
        fill="url(#cw-gold-highlight)"
      />
      <path
        d="M78 58 L108 48 C106 62 96 74 84 74 L74 64 Z"
        fill="url(#cw-gold-body)"
      />

      {/* Right Lower Wing Flange (Anchoring Claw) */}
      <path
        d="M60 76 L72 70 L94 80 C88 90 78 98 64 102 L60 88 Z"
        fill="url(#cw-gold-shadow)"
      />
      <path
        d="M62 74 L74 68 L94 80 C86 84 74 84 64 80 Z"
        fill="url(#cw-gold-highlight)"
      />

      {/* ================= CENTRAL CROWN & BRACKET ================= */}

      {/* Top Crown Apex Spire */}
      <polygon
        points="60,10 68,26 60,34 52,26"
        fill="url(#cw-gold-highlight)"
      />
      <polygon
        points="60,10 52,26 60,34"
        fill="url(#cw-gold-body)"
      />
      <circle cx="60" cy="24" r="2.5" fill="#FFFBEB" />

      {/* Central Diamond Crystal Housing (Hextech Bracket) */}
      <path
        d="M60 36 L72 48 L70 70 L60 84 L50 70 L48 48 Z"
        fill="#0A0E17"
        stroke="url(#cw-gold-body)"
        strokeWidth="1.5"
      />

      {/* ================= CENTRAL BLAZING RIFT CRYSTAL ================= */}

      {/* Glowing Outer Crystal Core with Bloom */}
      <polygon
        points="60,40 70,58 60,78 50,58"
        fill="url(#cw-rift-fire)"
        opacity="0.4"
        filter="url(#cw-bloom)"
      />

      {/* Left Facet of Crystal (Deep Amber / Fire) */}
      <polygon
        points="60,41 51,58 60,77"
        fill="#F97316"
      />

      {/* Right Facet of Crystal (Bright Golden Flame) */}
      <polygon
        points="60,41 69,58 60,77"
        fill="url(#cw-rift-fire)"
      />

      {/* Inner Specular Light Diamond */}
      <polygon
        points="60,46 65,58 60,70 55,58"
        fill="#FFFBEB"
        opacity="0.95"
      />

      {/* Dimensional Rift Electric Fracture */}
      <path
        d="M60,43 L58,52 L62,57 L58,64 L61,69 L60,74"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom Finial Diamond */}
      <polygon
        points="60,86 66,96 60,106 54,96"
        fill="url(#cw-gold-highlight)"
      />
      <polygon
        points="60,86 54,96 60,106"
        fill="url(#cw-gold-shadow)"
      />
    </svg>
  );
}

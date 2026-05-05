export function CyberOperator({
  variant = "alpha",
  className,
}: {
  variant?: "alpha" | "beta" | "gamma";
  className?: string;
}): React.ReactElement {
  // Stylized anime-inspired SOC operator silhouette built entirely from SVG.
  // Three palette variants for different stations.
  const palette = {
    alpha: { primary: "#22d3ee", secondary: "#a855f7", glow: "#22d3ee" },
    beta: { primary: "#ff2bd6", secondary: "#22d3ee", glow: "#ff2bd6" },
    gamma: { primary: "#22ff88", secondary: "#a855f7", glow: "#22ff88" },
  }[variant];

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`hair-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.primary} stopOpacity="0.95" />
          <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`suit-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f1626" />
          <stop offset="100%" stopColor="#04060d" />
        </linearGradient>
        <radialGradient id={`halo-${variant}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.glow} stopOpacity="0.55" />
          <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`g-${variant}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Aura halo */}
      <circle cx="100" cy="90" r="72" fill={`url(#halo-${variant})`} />

      {/* Workstation desk silhouette */}
      <path
        d="M10 220 L190 220 L190 215 L10 215 Z"
        fill="#020308"
        stroke={palette.primary}
        strokeOpacity="0.4"
      />
      <rect
        x="60"
        y="195"
        width="80"
        height="22"
        fill="url(#suit-alpha)"
        stroke={palette.primary}
        strokeOpacity="0.5"
      />
      {/* Holo screen */}
      <rect
        x="35"
        y="155"
        width="130"
        height="40"
        rx="3"
        fill="#020308"
        stroke={palette.primary}
        strokeOpacity="0.7"
      />
      <line
        x1="35"
        y1="170"
        x2="165"
        y2="170"
        stroke={palette.primary}
        strokeOpacity="0.35"
      />
      <line
        x1="35"
        y1="180"
        x2="120"
        y2="180"
        stroke={palette.secondary}
        strokeOpacity="0.4"
      />
      <line
        x1="35"
        y1="188"
        x2="100"
        y2="188"
        stroke={palette.primary}
        strokeOpacity="0.25"
      />

      {/* Body / suit */}
      <path
        d="M65 200 C65 175 80 155 100 155 C120 155 135 175 135 200 Z"
        fill={`url(#suit-${variant})`}
        stroke={palette.primary}
        strokeOpacity="0.7"
      />
      {/* Suit accent line */}
      <path
        d="M85 165 L100 198 L115 165"
        fill="none"
        stroke={palette.primary}
        strokeWidth="0.8"
        strokeOpacity="0.85"
      />

      {/* Neck */}
      <rect
        x="93"
        y="135"
        width="14"
        height="20"
        fill="#1a1f2e"
        stroke={palette.primary}
        strokeOpacity="0.4"
      />

      {/* Head */}
      <ellipse
        cx="100"
        cy="115"
        rx="26"
        ry="30"
        fill="#1a1f2e"
        stroke={palette.primary}
        strokeOpacity="0.5"
      />

      {/* Hair (stylized anime spikes) */}
      <path
        d="M74 105
           Q70 80 95 70
           Q85 60 105 60
           Q115 55 130 75
           Q132 90 128 110
           L122 95
           L118 110
           L112 92
           L106 110
           L98 90
           L92 110
           L84 92
           Z"
        fill={`url(#hair-${variant})`}
        opacity="0.95"
      />
      <path
        d="M74 105 L78 120 M126 105 L122 120"
        stroke={palette.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Visor */}
      <rect
        x="82"
        y="108"
        width="36"
        height="8"
        rx="2"
        fill="#020308"
        stroke={palette.primary}
        strokeOpacity="0.95"
      />
      <rect
        x="82"
        y="108"
        width="36"
        height="8"
        rx="2"
        fill={palette.primary}
        opacity="0.18"
      />
      <line
        x1="84"
        y1="112"
        x2="116"
        y2="112"
        stroke={palette.primary}
        strokeWidth="0.6"
        opacity="0.9"
      />
      {/* Visor scan dot */}
      <circle cx="112" cy="112" r="1" fill="#fff">
        <animate
          attributeName="cx"
          values="84;116;84"
          dur="3.2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Headset */}
      <path
        d="M76 102 Q78 88 100 86 Q122 88 124 102"
        fill="none"
        stroke={palette.primary}
        strokeWidth="1.5"
        opacity="0.8"
      />
      <circle
        cx="76"
        cy="106"
        r="4"
        fill="#020308"
        stroke={palette.primary}
        strokeWidth="1.2"
      />
      <circle cx="76" cy="106" r="1.4" fill={palette.glow}>
        <animate
          attributeName="opacity"
          values="0.4;1;0.4"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Mic boom */}
      <path
        d="M76 110 Q70 122 84 130"
        fill="none"
        stroke={palette.primary}
        strokeWidth="1"
        opacity="0.7"
      />
      <circle cx="86" cy="131" r="1.4" fill={palette.glow} />

      {/* Cheek tech tattoo */}
      <path
        d="M118 122 L124 124 L124 128"
        fill="none"
        stroke={palette.secondary}
        strokeWidth="0.7"
        opacity="0.8"
      />

      {/* Shoulder pauldron lights */}
      <circle cx="68" cy="170" r="1.6" fill={palette.glow} filter={`url(#g-${variant})`} />
      <circle cx="132" cy="170" r="1.6" fill={palette.glow} filter={`url(#g-${variant})`} />
    </svg>
  );
}

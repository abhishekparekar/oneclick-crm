import React from 'react';

interface StatusBadgeProps {
  name: string;
  color?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function StatusBadge({ name, color = '#9CA3AF' }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 select-none"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1,
        backgroundColor: hexToRgba(color, 0.1),
        color: color,
        border: `1px solid ${hexToRgba(color, 0.2)}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {name}
    </span>
  );
}


import React from "react";

export default function OneClickLogo({ className = "", variant = "landscape" }) {
  if (variant === "square") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src="/one_click_square.jpeg"
          alt="ONE CLICK"
          style={{
            height: 34,
            width: 34,
            objectFit: "contain",
            borderRadius: 8,
            mixBlendMode: "screen",
          }}
        />
      </div>
    );
  }

  // Landscape logo: centered with mixBlendMode screen
  return (
    <div className={`flex items-center justify-center w-full ${className}`}>
      <img
        src="/one_click_landscape.jpeg"
        alt="ONE CLICK"
        style={{
          height: 38,
          width: "auto",
          maxWidth: 175,
          objectFit: "contain",
          mixBlendMode: "screen",
          display: "block",
          margin: "0 auto",
        }}
      />
    </div>
  );
}

import React from "react";
import logo from "../assets/logo.png";

interface MahiraLogoProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

export const MahiraLogo: React.FC<MahiraLogoProps> = ({ className, size = 120, style }) => {
  return (
    <img 
      src={logo} 
      alt="Mahira Health Care Logo"
      className={className}
      style={{ 
        width: size, 
        height: size, 
        display: "inline-block", 
        flexShrink: 0,
        objectFit: "contain",
        ...style 
      }}
    />
  );
};

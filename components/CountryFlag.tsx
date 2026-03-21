"use client";

interface CountryFlagProps {
  code: string;
  size?: number;
  className?: string;
}

export function CountryFlag({ code, size = 20, className = "" }: CountryFlagProps) {
  if (!code) return null;
  const lowerCode = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${lowerCode}.png`}
      srcSet={`https://flagcdn.com/w80/${lowerCode}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={code}
      className={`inline-block ${className}`}
      style={{ verticalAlign: "middle" }}
      loading="lazy"
    />
  );
}

export function countryFlagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

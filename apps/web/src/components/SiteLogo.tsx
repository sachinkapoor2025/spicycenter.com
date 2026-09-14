import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function SiteLogo({
  size = "desktop",
  priority = false,
  className = "",
}: {
  size?: "desktop" | "mobile";
  priority?: boolean;
  className?: string;
}) {
  const height = size === "desktop" ? 48 : 36;
  const width = size === "desktop" ? 180 : 140;
  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <Image
        src={site.logoSrc}
        alt={site.name}
        width={width}
        height={height}
        className="h-9 md:h-12 w-auto max-w-[140px] md:max-w-[180px] object-contain object-left"
        priority={priority}
      />
    </span>
  );
}

export function SiteLogoLink({
  size = "desktop",
  priority = false,
  className = "",
  onClick,
}: {
  size?: "desktop" | "mobile";
  priority?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link href="/" className={`inline-block shrink-0 ${className}`.trim()} onClick={onClick} aria-label={site.name}>
      <SiteLogo size={size} priority={priority} />
    </Link>
  );
}

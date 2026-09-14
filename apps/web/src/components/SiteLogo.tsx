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
  const height = size === "desktop" ? 56 : 44;
  const width = size === "desktop" ? 200 : 156;
  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <Image
        src={site.logoSrc}
        alt={site.name}
        width={width}
        height={height}
        className="h-11 md:h-14 w-auto max-w-[200px] object-contain object-left"
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

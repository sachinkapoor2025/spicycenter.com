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
  const px = size === "desktop" ? 48 : 40;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <Image
        src={site.logoSrc}
        alt=""
        width={px}
        height={px}
        className="rounded-full"
        priority={priority}
      />
      <span className="font-serif text-lg md:text-xl font-semibold text-charcoal tracking-tight">
        Spicy<span className="text-nav">Corner</span>
      </span>
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

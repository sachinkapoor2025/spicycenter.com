import Link from "next/link";
import { enquiryHref } from "@/lib/catalogue";

export function EnquireNowLink({
  productName,
  quantity,
  className = "btn-primary inline-flex justify-center text-center",
  children = "Enquire Now",
}: {
  productName: string;
  quantity?: string;
  className?: string;
  children?: string;
}) {
  return (
    <Link href={enquiryHref(productName, quantity)} className={className}>
      {children}
    </Link>
  );
}

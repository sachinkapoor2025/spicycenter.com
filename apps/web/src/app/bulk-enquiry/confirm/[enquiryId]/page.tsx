import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { BulkEnquiryConfirm } from "@/components/BulkEnquiryConfirm";

type Props = { params: Promise<{ enquiryId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { enquiryId } = await params;
  return pageMetadata({
    title: `Bulk enquiry ${enquiryId}`,
    description: "Your SpicyCenter bulk spice enquiry confirmation.",
    path: `/bulk-enquiry/confirm/${enquiryId}`,
    noIndex: true,
  });
}

export default async function BulkEnquiryConfirmPage({ params }: Props) {
  const { enquiryId } = await params;
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="spice-heading text-3xl">Enquiry received</h1>
      <BulkEnquiryConfirm enquiryId={enquiryId} />
      <p className="mt-8 text-sm">
        <Link href="/bulk-enquiry" className="text-nav">
          New enquiry
        </Link>
        {" · "}
        <Link href="/wholesale" className="text-nav">
          Wholesale
        </Link>
      </p>
    </div>
  );
}

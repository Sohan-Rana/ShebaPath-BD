import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverGet } from "@/lib/api";
import type { ServiceDetail } from "@/lib/types";
import { ServiceView } from "./service-view";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await serverGet<ServiceDetail>(`/api/services/${encodeURIComponent(slug)}`);
  if (!s) return { title: "Service" };
  return { title: `${s.title_bn} / ${s.title_en}`, description: s.summary_bn ?? s.summary_en ?? undefined };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await serverGet<ServiceDetail>(`/api/services/${encodeURIComponent(slug)}`);
  if (!service) notFound();
  return <ServiceView service={service} />;
}

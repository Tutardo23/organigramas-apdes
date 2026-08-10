import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    organigrama?: string | string[];
  }>;
};

export default async function LegacyExploreOrganigramaPage({
  params,
  searchParams,
}: PageProps) {
  const { schoolSlug } = await params;
  const search = await searchParams;
  const requestedParam = search.organigrama;
  const requestedId = Array.isArray(requestedParam)
    ? requestedParam[0]
    : requestedParam;

  const query = new URLSearchParams();
  if (requestedId) query.set("organigrama", requestedId);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(`/organigramas/${schoolSlug}${suffix}`);
}

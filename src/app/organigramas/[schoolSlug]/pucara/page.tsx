import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    organigrama?: string | string[];
    modo?: string | string[];
  }>;
};

// Compatibilidad con la URL usada durante las pruebas. La versión real vive
// ahora en /organigramas/[schoolSlug].
export default async function LegacyPucaraOrganigramaPage({ params, searchParams }: PageProps) {
  const { schoolSlug } = await params;
  const search = await searchParams;
  const query = new URLSearchParams();

  const requestedParam = search.organigrama;
  const requestedId = Array.isArray(requestedParam) ? requestedParam[0] : requestedParam;
  if (requestedId) query.set("organigrama", requestedId);

  const modeParam = search.modo;
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  if (mode === "editar") query.set("modo", "editar");

  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(`/organigramas/${schoolSlug}${suffix}`);
}

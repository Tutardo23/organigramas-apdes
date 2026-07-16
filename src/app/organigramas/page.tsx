import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Home,
  MapPin,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { DemoBadge } from "../../components/DemoBadge";
import { createSchoolAndOrgChartAction, deleteSchoolAction } from "./actions";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organigramas | APDES",
  description: "Gestión de organigramas institucionales por colegio.",
};

export default async function OrganigramasPage() {
  const schools = await prisma.school.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      orgCharts: {
        orderBy: {
          year: "desc",
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Menú principal
          </Link>

          <DemoBadge />
        </div>

        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
              APDES
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">
              Organigramas institucionales
            </h1>

            <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-slate-600">
              Elegí un colegio para leer su estructura, revisar responsabilidades
              y reconocer cómo colaboran sus áreas. La edición aparece solo cuando
              realmente la necesitás.
            </p>
          </div>

          <form
            action={createSchoolAndOrgChartAction}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Agregar colegio
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  Inicia una estructura institucional vacía.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                name="name"
                required
                placeholder="Nombre del colegio"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="city"
                  placeholder="Ciudad"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <input
                  name="province"
                  placeholder="Provincia"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <input
                name="year"
                type="number"
                defaultValue={new Date().getFullYear()}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Crear estructura
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {schools.map((school) => {
            const latestChart = school.orgCharts[0];

            return (
              <div
                key={school.id}
                className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        {school.name}
                      </h2>

                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {school.city ?? "Ciudad"} · {school.province ?? "Provincia"}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    {latestChart?.status ?? "SIN ORGANIGRAMA"}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-500">
                    Último organigrama
                  </p>

                  <p className="mt-1 font-black text-slate-900">
                    {latestChart?.title ?? "Todavía no cargado"}
                  </p>

                  {latestChart && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      Año {latestChart.year}
                    </p>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                  <Link
                    href={`/organigramas/${school.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    Abrir organigrama <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/organigramas/${school.slug}/editar`}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-600 transition hover:bg-slate-50"
                    aria-label={`Editar organigrama de ${school.name}`}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Link>
                </div>

                <details className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-red-700 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-600">Administración</span>
                    </span>
                    <span className="text-xs font-black text-red-500">
                      Abrir
                    </span>
                  </summary>

                  <div className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold leading-relaxed text-red-800">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Esto elimina el colegio, sus organigramas, cajas,
                        relaciones y personas cargadas. Usalo solo si lo creaste
                        por error.
                      </p>
                    </div>

                    <form action={deleteSchoolAction} className="mt-3">
                      <input type="hidden" name="schoolId" value={school.id} />
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Confirmar eliminación
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

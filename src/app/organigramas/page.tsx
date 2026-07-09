import Link from "next/link";
import { Building2, CalendarDays, MapPin, Plus, Settings2 } from "lucide-react";
import { createSchoolAndOrgChartAction } from "./actions";
import { prisma } from "../../lib/prisma";

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
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">
              APDES
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              Organigramas institucionales
            </h1>

            <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-slate-600">
              Plataforma para construir, revisar y actualizar los organigramas de
              cada colegio. Cada organigrama puede tener cargos, funciones reales,
              personas asignadas, horas y relaciones jerárquicas o transversales.
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
                  Crear nuevo
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  Crea un colegio y su organigrama inicial.
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
                Crear y editar
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

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link
                    href={`/organigramas/${school.slug}`}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/organigramas/${school.slug}/editar`}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    <Settings2 className="h-4 w-4" />
                    Editar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

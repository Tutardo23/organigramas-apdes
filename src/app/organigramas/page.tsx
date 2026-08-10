import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Home,
  MapPin,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { createSchoolAndOrgChartAction, deleteSchoolAction } from "./actions";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organigramas | APDES",
  description: "Gestión de organigramas institucionales por colegio.",
};

export default async function OrganigramasPage() {
  const schools = await prisma.school.findMany({
    orderBy: { name: "asc" },
    include: {
      orgCharts: {
        orderBy: [{ year: "desc" }, { version: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <section className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
          <Home className="h-4 w-4" /> Menú principal
        </Link>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-700">APDES</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950">Organigramas institucionales</h1>
            <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-slate-600">
              Cada colegio trabaja su organigrama desde una base simple. Las dependencias forman la estructura; Integra y Colabora se muestran solo cuando seleccionás una función.
            </p>
          </div>

          <form action={createSchoolAndOrgChartAction} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Plus className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Agregar colegio</h2>
                <p className="text-sm font-medium text-slate-500">Nombre, base y listo.</p>
              </div>
            </div>

            <input name="name" required placeholder="Nombre del colegio" className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            <input type="hidden" name="year" value={year} />

            <div className="mt-3 space-y-2">
              <label className="block cursor-pointer rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-3.5 transition has-[:checked]:border-blue-600 has-[:checked]:ring-4 has-[:checked]:ring-blue-100">
                <input type="radio" name="startMode" value="simple" defaultChecked className="sr-only" />
                <span className="block text-sm font-black text-slate-950">Base simple · recomendada</span>
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">Consejo de Dirección → Dirección General. Después agregás solo las áreas que correspondan.</span>
              </label>
              <label className="block cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-3.5 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                <input type="radio" name="startMode" value="core" className="sr-only" />
                <span className="block text-sm font-black text-slate-950">Base por áreas</span>
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">Además carga Inicial, Primaria, Secundaria, Formación, Familias y Administración.</span>
              </label>
              <label className="block cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-3.5 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                <input type="radio" name="startMode" value="empty" className="sr-only" />
                <span className="block text-sm font-black text-slate-950">Desde cero</span>
              </label>
            </div>

            <details className="mt-3 rounded-2xl bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-black text-slate-500">Ciudad y provincia · opcional</summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input name="city" placeholder="Ciudad" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400" />
                <input name="province" placeholder="Provincia" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400" />
              </div>
            </details>

            <button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800">
              <Plus className="h-4 w-4" /> Crear colegio y editar
            </button>
          </form>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {schools.map((school) => {
            const latestChart = school.orgCharts[0];
            return (
              <div key={school.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-xl font-black text-slate-950">{school.name}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500"><MapPin className="h-4 w-4" />{school.city ?? "Sin ciudad"}{school.province ? ` · ${school.province}` : ""}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{latestChart?.status ?? "SIN ORGANIGRAMA"}</span>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-900">{latestChart?.title ?? "Todavía no cargado"}</p>
                  {latestChart ? <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500"><CalendarDays className="h-4 w-4" /> Año {latestChart.year} · {school.orgCharts.length} {school.orgCharts.length === 1 ? "versión" : "versiones"}</p> : null}
                </div>

                <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                  <Link href={latestChart ? `/organigramas/${school.slug}?organigrama=${latestChart.id}` : `/organigramas/${school.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800">Abrir <ArrowRight className="h-4 w-4" /></Link>
                  {latestChart ? (
                    <Link href={`/organigramas/${school.slug}?organigrama=${latestChart.id}&modo=editar`} className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-600 transition hover:bg-slate-50" aria-label={`Editar ${school.name}`}><Settings2 className="h-4 w-4" /></Link>
                  ) : null}
                </div>

                <details className="mt-3 rounded-xl px-2 py-1 text-xs text-slate-400">
                  <summary className="cursor-pointer font-bold">Administración</summary>
                  <form action={deleteSchoolAction} className="mt-2">
                    <input type="hidden" name="schoolId" value={school.id} />
                    <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 font-black text-rose-700"><Trash2 className="h-3.5 w-3.5" /> Eliminar colegio</button>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

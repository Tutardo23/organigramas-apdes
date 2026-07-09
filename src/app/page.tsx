import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  Network,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

export const metadata = {
  title: "APDES | Organigramas y Talento",
  description:
    "Plataforma institucional para organigramas editables, revisión y tablero dinámico de talento.",
};

const modules = [
  {
    title: "Organigramas",
    description:
      "Editor visual para crear cargos, áreas, personas, horas, iconos, colores y relaciones jerárquicas o transversales.",
    href: "/organigramas",
    Icon: Network,
    tag: "Base institucional",
  },
  {
    title: "Talento",
    description:
      "Dashboard dinámico para leer personas, funciones, horas, potencial, competencias, capacitaciones y evaluaciones.",
    href: "/talento",
    Icon: BrainCircuit,
    tag: "Nuevo módulo",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative p-7 md:p-10">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-100 blur-3xl" />
            <div className="absolute bottom-0 right-24 h-44 w-44 rounded-full bg-amber-100 blur-3xl" />

            <div className="relative max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                <Sparkles className="h-4 w-4" />
                Plataforma APDES
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Organigramas editables y tablero de talento
              </h1>

              <p className="mt-5 max-w-3xl text-base font-semibold leading-relaxed text-slate-500 md:text-lg">
                Una base común para que los colegios actualicen su estructura,
                revisen responsabilidades y empiecen a construir una lectura de
                talento institucional desde los mismos datos.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/organigramas"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
                >
                  Ver organigramas
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/talento"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Probar talento
                  <BrainCircuit className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {modules.map(({ title, description, href, Icon, tag }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-blue-700">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      {tag}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                      {description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-700" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <Building2 className="h-6 w-6 text-blue-700" />
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Por colegio
            </h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Cada institución puede tener su estructura, personas y lectura de
              talento sin mezclar datos.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <UsersRound className="h-6 w-6 text-blue-700" />
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Personas y horas
            </h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              El tablero de talento toma responsables, equipos, funciones y
              horas cargadas en el organigrama.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-blue-700" />
            <h3 className="mt-3 text-lg font-black text-slate-950">
              Preparado para revisión
            </h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              La base queda lista para sumar permisos, publicación, revisión y
              seguimiento institucional.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

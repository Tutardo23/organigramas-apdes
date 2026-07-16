import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Network,
  Route,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { DemoBadge } from "../components/DemoBadge";

export const metadata = {
  title: "Organización y talento",
  description:
    "Una herramienta para visualizar responsabilidades, vínculos y capacidades institucionales en cada colegio.",
};

const steps = [
  { n: "01", title: "Organizar", text: "Representá áreas, funciones, responsables y equipos." },
  { n: "02", title: "Relacionar", text: "Mostrá dependencias, colaboración y acompañamiento." },
  { n: "03", title: "Revisar", text: "Detectá vacíos, concentraciones y aspectos por conversar." },
  { n: "04", title: "Acompañar", text: "Conectá la estructura con la información de talento." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-5 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">APDES</p>
              <p className="font-semibold text-slate-700">Organización y talento</p>
            </div>
          </div>
          <DemoBadge />
        </div>

        <div className="apdes-grid relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white px-6 py-10 shadow-[0_18px_55px_rgba(30,64,175,0.08)] sm:px-10 lg:px-14 lg:py-14">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Una estructura que se puede leer, revisar y mejorar</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                Más que cajas: responsabilidades, vínculos y personas.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
                Cada colegio puede construir una estructura flexible, reconocer cómo funciona realmente y conectar esa lectura con el desarrollo de sus equipos.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/organigramas" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg">
                  Explorar organigramas <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/talento" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50">
                  Ver talento <BrainCircuit className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-[#f7faff] p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Recorrido institucional</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">De la estructura a la conversación</h2>
                </div>
                <Route className="h-7 w-7 text-blue-700" />
              </div>
              <div className="mt-6 space-y-3">
                {steps.map((step, index) => (
                  <div key={step.n} className="relative flex gap-4 rounded-2xl border border-white bg-white p-4 shadow-sm">
                    {index < steps.length - 1 ? <span className="absolute left-[1.85rem] top-12 h-5 w-px bg-blue-100" /> : null}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">{step.n}</span>
                    <div><p className="font-bold text-slate-900">{step.title}</p><p className="mt-0.5 text-sm leading-5 text-slate-500">{step.text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Link href="/organigramas" className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
            <div className="flex items-start gap-4"><div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white"><Network className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Organigrama institucional</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Construir y revisar la organización</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Visualizá cargos, funciones reales, equipos y relaciones de trabajo sin imponer una estructura única.</p></div><ArrowRight className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-700" /></div>
          </Link>
          <Link href="/talento" className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
            <div className="flex items-start gap-4"><div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white"><UsersRound className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Talento de la red</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Conocer y acompañar a las personas</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Consultá funciones, competencias, capacitaciones y evaluaciones desde una ficha clara por persona.</p></div><ArrowRight className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700" /></div>
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[{Icon:CheckCircle2,t:"Basado en el marco institucional",d:"La revisión contempla áreas críticas, función real y vínculos transversales."},{Icon:UsersRound,t:"Una sola base de personas",d:"La información cargada en la estructura alimenta las fichas de talento."},{Icon:ShieldCheck,t:"Preparado para revisión",d:"Borradores, observaciones y publicación dentro de un mismo recorrido."}].map(({Icon,t,d})=><div key={t} className="rounded-3xl border border-slate-200 bg-white p-5"><Icon className="h-5 w-5 text-blue-700"/><h3 className="mt-3 font-bold text-slate-900">{t}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{d}</p></div>)}
        </div>
      </section>
    </main>
  );
}

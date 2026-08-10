"use client";

import { HelpCircle, UserPlus, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

type NodeOption = {
  id: string;
  title: string;
};

type Props = {
  schoolSlug: string;
  initialNodes: NodeOption[];
};

type TourStepId = "card" | "expand" | "arrows" | "details" | "navigation" | "edit";

type TourStep = {
  id: TourStepId;
  title: string;
  description: string;
};

type PositionedNode = NodeOption & {
  element: HTMLElement;
};

type RectState = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "card",
    title: "Cada tarjeta es una función",
    description:
      "Tocá una tarjeta para enfocarla. Vas a ver con claridad dónde estás parado y, si esa función tiene vínculos Integra o Colabora, aparecen sus relaciones directas sin llenar de líneas todo el organigrama.",
  },
  {
    id: "expand",
    title: "El + abre lo que depende de esa función",
    description:
      "Cuando una tarjeta tiene funciones debajo, aparece el botón +. Tocándolo desplegás el siguiente nivel. Si la rama ya está abierta, el botón cambia y permite volver a cerrarla.",
  },
  {
    id: "arrows",
    title: "Movete con las flechas",
    description:
      "Usá las flechas de abajo para subir, bajar o pasar entre funciones del mismo nivel. También podés usar ↑ ↓ ← → directamente desde el teclado.",
  },
  {
    id: "details",
    title: "Detalles te explica qué hay dentro de la tarjeta",
    description:
      "El botón amarillo con la i abre la ficha de la función. Ahí podés leer qué hace, quiénes trabajan en ella, sus roles, horas y correo cuando estén cargados. Abrir la ficha no modifica nada.",
  },
  {
    id: "navigation",
    title: "Atrás, Ver todo y Reiniciar",
    description:
      "Atrás vuelve al estado anterior, Ver todo despliega la estructura completa y Reiniciar vuelve al comienzo. Son atajos para explorar sin perderte.",
  },
  {
    id: "edit",
    title: "Ver y Editar son el mismo organigrama",
    description:
      "En Ver solamente explorás. Editar mantiene exactamente esta misma estructura y agrega las herramientas para mover cajas, cargar personas, crear funciones y administrar vínculos.",
  },
];

function normalizedText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function findButtonByText(text: string) {
  if (typeof document === "undefined") return null;
  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => normalizedText(button.textContent) === text,
    ) ?? null
  );
}

function findButtonStartingWith(text: string) {
  if (typeof document === "undefined") return null;
  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      normalizedText(button.textContent).startsWith(text),
    ) ?? null
  );
}

function visibleElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function collectNodes(initialNodes: NodeOption[]): PositionedNode[] {
  if (typeof document === "undefined") return [];

  const initialById = new Map(initialNodes.map((node) => [node.id, node.title]));
  const result = new Map<string, PositionedNode>();

  document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]").forEach((element) => {
    const id = element.dataset.id;
    if (!id || !visibleElement(element)) return;
    const title = normalizedText(element.querySelector("h3")?.textContent) || initialById.get(id) || "Función sin nombre";
    result.set(id, { id, title, element });
  });

  return Array.from(result.values()).sort((a, b) => a.title.localeCompare(b.title, "es"));
}

function resolveCardTarget() {
  if (typeof document === "undefined") return null;

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"),
  )
    .filter(visibleElement)
    .map((node) => {
      const card = node.firstElementChild;
      const heading = node.querySelector("h3");
      if (!(card instanceof HTMLElement) || !heading || !visibleElement(card)) return null;

      const rect = card.getBoundingClientRect();
      // Evitamos wrappers anómalos o nodos vacíos que puedan dejar un hueco
      // gigante en el spotlight de la guía.
      if (rect.width < 120 || rect.height < 80 || rect.width > 520 || rect.height > 620) return null;
      return { element: card, rect };
    })
    .filter((item): item is { element: HTMLElement; rect: DOMRect } => Boolean(item));

  if (!candidates.length) return null;

  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;
  candidates.sort((a, b) => {
    const distanceA = Math.hypot(
      a.rect.left + a.rect.width / 2 - viewportCenterX,
      a.rect.top + a.rect.height / 2 - viewportCenterY,
    );
    const distanceB = Math.hypot(
      b.rect.left + b.rect.width / 2 - viewportCenterX,
      b.rect.top + b.rect.height / 2 - viewportCenterY,
    );
    return distanceA - distanceB;
  });

  return candidates[0]?.element ?? null;
}

function resolveTourTarget(step: TourStepId) {
  if (typeof document === "undefined") return null;

  if (step === "card") {
    return resolveCardTarget();
  }

  if (step === "expand") {
    return (
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          'button[aria-label="Abrir dependencias"], button[aria-label="Cerrar dependencias"]',
        ),
      ).find(visibleElement) ?? null
    );
  }

  if (step === "arrows") {
    const down = document.querySelector<HTMLButtonElement>('button[aria-label="Bajar"]');
    if (!down) return null;
    const group = down.parentElement?.parentElement ?? null;
    return visibleElement(group) ? group : visibleElement(down) ? down : null;
  }

  if (step === "details") {
    return (
      Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-label="Ver ficha de la función"]')).find(
        visibleElement,
      ) ?? null
    );
  }

  if (step === "navigation") {
    const viewAll = findButtonByText("Ver todo");
    const group = viewAll?.parentElement ?? null;
    return visibleElement(group) ? group : visibleElement(viewAll) ? viewAll : null;
  }

  const edit = findButtonByText("Editar");
  const group = edit?.parentElement ?? null;
  return visibleElement(group) ? group : visibleElement(edit) ? edit : null;
}

function clickNode(nodeId: string) {
  const node = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(nodeId)}"]`);
  if (!node) return false;
  node.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
  return true;
}

export function OrgChartExperienceLayer({ schoolSlug, initialNodes }: Props) {
  const [isEditing, setIsEditing] = useState<boolean | null>(null);
  const [portalNodes, setPortalNodes] = useState<PositionedNode[]>([]);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserQuery, setChooserQuery] = useState("");
  const [chooserNodes, setChooserNodes] = useState<PositionedNode[]>([]);

  const storageKey = `hito-organigrama-guide-v1:${schoolSlug}`;

  const scanInterface = useCallback(() => {
    const globalAddPerson = findButtonByText("Agregar persona");
    const editingNow = Boolean(globalAddPerson);
    setIsEditing(editingNow);
    setPortalNodes(editingNow ? collectNodes(initialNodes) : []);
    if (!editingNow) setChooserOpen(false);
  }, [initialNodes]);

  useEffect(() => {
    const initialFrame = window.requestAnimationFrame(scanInterface);
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(scanInterface);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", scanInterface);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      observer.disconnect();
      window.removeEventListener("popstate", scanInterface);
    };
  }, [scanInterface]);

  const finishTour = useCallback(() => {
    setTourOpen(false);
    setTargetRect(null);
    try {
      window.localStorage.setItem(storageKey, "done");
    } catch {
      // La guía sigue funcionando aunque el navegador bloquee localStorage.
    }
  }, [storageKey]);

  const openTour = useCallback(() => {
    setTourIndex(0);
    setTourOpen(true);
  }, []);

  useEffect(() => {
    if (isEditing !== false || tourOpen) return;
    let alreadySeen = false;
    try {
      alreadySeen = window.localStorage.getItem(storageKey) === "done";
    } catch {
      alreadySeen = false;
    }
    if (alreadySeen) return;

    const timer = window.setTimeout(() => {
      if (resolveTourTarget("card")) openTour();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [isEditing, openTour, storageKey, tourOpen]);

  useEffect(() => {
    if (!tourOpen || isEditing) return;

    let retryTimer: number | null = null;
    let attempts = 0;

    const update = () => {
      const step = TOUR_STEPS[tourIndex];
      const target = step ? resolveTourTarget(step.id) : null;
      if (!target) {
        attempts += 1;
        if (attempts < 8) {
          retryTimer = window.setTimeout(update, 120);
          return;
        }
        if (tourIndex < TOUR_STEPS.length - 1) setTourIndex((current) => current + 1);
        else finishTour();
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [finishTour, isEditing, tourIndex, tourOpen]);

  useEffect(() => {
    if (!tourOpen || isEditing) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [isEditing, tourOpen]);

  useEffect(() => {
    if (!tourOpen || !isEditing) return;
    const timer = window.setTimeout(() => {
      setTourOpen(false);
      setTargetRect(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isEditing, tourOpen]);

  const openPersonForNode = useCallback((nodeId: string) => {
    setChooserOpen(false);
    setChooserQuery("");

    if (!clickNode(nodeId)) return;

    window.setTimeout(() => {
      findButtonStartingWith("2. Personas")?.click();
      window.setTimeout(() => {
        findButtonByText("Agregar persona al equipo")?.click();
        window.setTimeout(() => {
          const marker = Array.from(document.querySelectorAll<HTMLElement>("p")).find(
            (item) => normalizedText(item.textContent) === "Nueva persona",
          );
          marker?.closest("form")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }, 70);
    }, 90);
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    const interceptGlobalAddPerson = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.dataset.cardAddPerson === "true") return;
      if (normalizedText(target.textContent) !== "Agregar persona") return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const nodes = collectNodes(initialNodes);
      setChooserNodes(nodes);
      setChooserQuery("");
      setChooserOpen(true);
    };

    document.addEventListener("click", interceptGlobalAddPerson, true);
    return () => document.removeEventListener("click", interceptGlobalAddPerson, true);
  }, [initialNodes, isEditing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (tourOpen && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      if (event.key !== "Escape") return;
      if (chooserOpen) {
        setChooserOpen(false);
        return;
      }
      if (tourOpen) finishTour();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [chooserOpen, finishTour, tourOpen]);

  const filteredChooserNodes = useMemo(() => {
    const query = chooserQuery.trim().toLocaleLowerCase("es");
    if (!query) return chooserNodes;
    return chooserNodes.filter((node) => node.title.toLocaleLowerCase("es").includes(query));
  }, [chooserNodes, chooserQuery]);

  const currentStep = TOUR_STEPS[tourIndex];
  const tooltipWidth = 380;
  const tooltipLeft = targetRect
    ? Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, targetRect.left + targetRect.width / 2 - tooltipWidth / 2))
    : 16;
  const tooltipTop = targetRect
    ? targetRect.top + targetRect.height + 18 + 245 < window.innerHeight
      ? targetRect.top + targetRect.height + 18
      : Math.max(16, targetRect.top - 245)
    : 120;

  return (
    <>
      {isEditing
        ? portalNodes.map((node) =>
            createPortal(
              <button
                type="button"
                data-card-add-person="true"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openPersonForNode(node.id);
                }}
                className="nodrag nopan absolute -bottom-[22px] right-3 z-[65] inline-flex h-11 items-center justify-center gap-1.5 rounded-full border-4 border-white bg-amber-400 px-3 text-xs font-black text-[#123868] shadow-lg transition hover:scale-105 hover:bg-amber-300"
                aria-label={`Agregar persona a ${node.title}`}
                title={`Agregar persona directamente a ${node.title}`}
              >
                <UserPlus className="h-4 w-4" />
                <span>Persona</span>
              </button>,
              node.element,
              `card-person-${node.id}`,
            ),
          )
        : null}

      {isEditing === false && !tourOpen ? (
        <button
          type="button"
          onClick={openTour}
          className="fixed right-5 top-28 z-[65] inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/95 px-4 py-2.5 text-sm font-black text-blue-700 shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50"
        >
          <HelpCircle className="h-4 w-4" /> Mostrar guía
        </button>
      ) : null}

      {tourOpen && !isEditing && currentStep ? (
        <>
          <div
            aria-label="Guía activa: el organigrama queda temporalmente bloqueado"
            className="fixed inset-0 z-[205] cursor-default touch-none"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onWheel={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
          {targetRect ? (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[210] rounded-2xl border-2 border-amber-300 ring-4 ring-amber-300/35 animate-pulse"
              style={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.68), 0 0 42px rgba(251, 191, 36, 0.7)",
              }}
            />
          ) : (
            <div className="pointer-events-none fixed inset-0 z-[210] bg-slate-950/65" />
          )}

          <section
            role="dialog"
            aria-label="Guía del organigrama"
            className="fixed z-[220] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl"
            style={{ left: tooltipLeft, top: tooltipTop }}
          >
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                    Guía · {tourIndex + 1} de {TOUR_STEPS.length}
                  </p>
                  <h2 className="mt-1 text-lg font-black leading-tight text-slate-950">{currentStep.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={finishTour}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  aria-label="Cerrar guía"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{currentStep.description}</p>
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-4">
              <button type="button" onClick={finishTour} className="text-xs font-black text-slate-400 transition hover:text-slate-700">
                Saltar guía
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tourIndex === 0}
                  onClick={() => setTourIndex((current) => Math.max(0, current - 1))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tourIndex === TOUR_STEPS.length - 1) finishTour();
                    else setTourIndex((current) => current + 1);
                  }}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-800"
                >
                  {tourIndex === TOUR_STEPS.length - 1 ? "Terminar" : "Siguiente"}
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {chooserOpen ? (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={() => setChooserOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Elegir caja para agregar persona"
            className="w-full max-w-[620px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Agregar persona</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">¿En qué caja trabaja?</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                  Elegí la función y te llevamos directo al formulario de esa caja. Si usás el botón Persona que aparece sobre una tarjeta, este paso se salta porque la caja ya está elegida.
                </p>
              </div>
              <button type="button" onClick={() => setChooserOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 md:p-6">
              <input
                autoFocus
                value={chooserQuery}
                onChange={(event) => setChooserQuery(event.target.value)}
                placeholder="Buscar una función…"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />

              <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredChooserNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => openPersonForNode(node.id)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 hover:ring-4 hover:ring-amber-100"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Caja</p>
                    <p className="mt-1 text-sm font-black leading-snug text-slate-950">{node.title}</p>
                  </button>
                ))}
              </div>

              {filteredChooserNodes.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
                  No encontramos una caja con ese nombre.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}


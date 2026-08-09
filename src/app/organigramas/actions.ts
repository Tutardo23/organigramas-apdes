"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { getOrgSimplePreset } from "../../lib/org-simple-presets";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function createSchoolAndOrgChartAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const yearValue = Number(formData.get("year") ?? new Date().getFullYear());
  const year = Number.isFinite(yearValue) ? Math.round(yearValue) : new Date().getFullYear();
  const requestedMode = String(formData.get("startMode") ?? "simple");
  const startMode = requestedMode === "empty" || requestedMode === "core" ? requestedMode : "simple";

  if (!name) throw new Error("El nombre del colegio es obligatorio.");
  const slug = slugify(name);
  if (!slug) throw new Error("Ingresá un nombre de colegio válido.");

  const school = await (prisma as any).school.upsert({
    where: { slug },
    update: {
      name,
      city: city || undefined,
      province: province || undefined,
    },
    create: {
      name,
      slug,
      city: city || null,
      province: province || null,
    },
  });

  const existingChart = await (prisma as any).orgChart.findFirst({
    where: { schoolId: school.id, year },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  });

  if (existingChart) {
    redirect(`/organigramas/${school.slug}?organigrama=${existingChart.id}&modo=editar`);
  }

  const chart = await prisma.$transaction(async (tx) => {
    const createdChart = await (tx as any).orgChart.create({
      data: {
        schoolId: school.id,
        title: `Organigrama Institucional ${school.name} ${year}`,
        year,
        version: 1,
        status: "DRAFT",
        summary: "Organigrama institucional editable.",
      },
    });

    if (startMode === "empty") return createdChart;

    const council = await (tx as any).orgNode.create({
      data: {
        orgChartId: createdChart.id,
        title: "Consejo de Dirección",
        area: "DIRECCION",
        formalRole: "Órgano de conducción institucional",
        realFunction: "Conducción colegiada y definición de criterios",
        description: "Define criterios, prioridades y acompaña la conducción general del colegio.",
        color: "#1C3A62",
        icon: "users",
        positionX: 760,
        positionY: 80,
        order: 1,
      },
    });

    const director = await (tx as any).orgNode.create({
      data: {
        orgChartId: createdChart.id,
        title: "Dirección General",
        area: "DIRECCION",
        formalRole: "Dirección del colegio",
        realFunction: "Conducción general",
        description: "Conduce la vida institucional y articula las decisiones de los distintos equipos.",
        color: "#2E6B4B",
        icon: "landmark",
        positionX: 760,
        positionY: 470,
        order: 2,
      },
    });

    await (tx as any).orgEdge.create({
      data: {
        orgChartId: createdChart.id,
        sourceId: council.id,
        targetId: director.id,
        type: "JERARQUICA",
        label: null,
      },
    });

    if (startMode === "core") {
      const starterKeys = [
        "nivel-inicial",
        "nivel-primario",
        "nivel-secundario",
        "formacion-integral",
        "familias",
        "administracion",
      ];
      for (const [index, key] of starterKeys.entries()) {
        const preset = getOrgSimplePreset(key);
        if (!preset) continue;
        const node = await (tx as any).orgNode.create({
          data: {
            orgChartId: createdChart.id,
            title: preset.title,
            area: preset.area,
            formalRole: preset.formalRole,
            realFunction: preset.realFunction,
            description: preset.description,
            color: preset.color,
            icon: preset.icon,
            positionX: 80 + index * 450,
            positionY: 900,
            order: index + 3,
          },
        });
        await (tx as any).orgEdge.create({
          data: {
            orgChartId: createdChart.id,
            sourceId: director.id,
            targetId: node.id,
            type: "JERARQUICA",
            label: null,
          },
        });
      }
    }

    return createdChart;
  }, { maxWait: 10_000, timeout: 30_000 });

  revalidatePath("/");
  revalidatePath("/organigramas");
  redirect(`/organigramas/${school.slug}?organigrama=${chart.id}&modo=editar`);
}

export async function deleteSchoolAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId") ?? "").trim();
  if (!schoolId) throw new Error("No se pudo identificar el colegio para eliminar.");

  await (prisma as any).school.delete({ where: { id: schoolId } });
  revalidatePath("/");
  revalidatePath("/organigramas");
  redirect("/organigramas");
}

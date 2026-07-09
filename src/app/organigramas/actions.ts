"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";

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
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();

  if (!name) {
    throw new Error("El nombre del colegio es obligatorio.");
  }

  const slug = slugify(name);

  const school = await prisma.school.upsert({
    where: {
      slug,
    },
    update: {
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

  const existingChart = await prisma.orgChart.findFirst({
    where: {
      schoolId: school.id,
      year,
    },
  });

  if (!existingChart) {
    await (prisma as any).orgChart.create({
      data: {
        schoolId: school.id,
        title: `Organigrama Institucional ${school.name} ${year}`,
        year,
        status: "DRAFT",
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/organigramas");
  redirect(`/organigramas/${school.slug}/editar`);
}

export async function deleteSchoolAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId") ?? "").trim();

  if (!schoolId) {
    throw new Error("No se pudo identificar el colegio para eliminar.");
  }

  await (prisma as any).school.delete({
    where: {
      id: schoolId,
    },
  });

  revalidatePath("/");
  revalidatePath("/organigramas");
  redirect("/organigramas");
}

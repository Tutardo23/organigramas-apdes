"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readJsonArray(formData: FormData, key: string) {
  const raw = readString(formData, key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function updatePersonTalentAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const schoolSlug = readString(formData, "schoolSlug");

  if (!personId || !schoolSlug) {
    throw new Error("Faltan datos para actualizar el perfil de talento.");
  }

  await (prisma as any).person.update({
    where: { id: personId },
    data: {
      potentialLevel: readString(formData, "potentialLevel") || "SIN_DEFINIR",
      talentNotes: readString(formData, "talentNotes") || null,
      competencies: readJsonArray(formData, "competencies"),
      trainings: readJsonArray(formData, "trainings"),
      evaluations: readJsonArray(formData, "evaluations"),
    },
  });

  revalidatePath(`/talento/${schoolSlug}`);

  return { ok: true };
}

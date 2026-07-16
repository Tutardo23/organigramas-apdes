import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const people = [
  { id: "demo-person-directora", firstName: "María", lastName: "González", formalRole: "Directora", realFunction: "Conducir el proyecto institucional y articular las decisiones del equipo directivo.", weeklyHours: 40, potentialLevel: "ALTO", competencies: [{ title: "Liderazgo de equipos", detail: "Muy sólido", score: 4 }], trainings: [{ title: "Dirección de instituciones educativas", detail: "APDES · 2025" }], evaluations: [{ title: "Evaluación anual", detail: "Desempeño destacado", score: 4 }], talentNotes: "Fortaleza para generar acuerdos. Próximo paso: desarrollar sucesores para funciones operativas." },
  { id: "demo-person-academica", firstName: "Lucía", lastName: "Fernández", formalRole: "Coordinadora académica", realFunction: "Acompañar la planificación, la observación de clases y el desarrollo docente.", weeklyHours: 36, potentialLevel: "ALTO", competencies: [{ title: "Acompañamiento pedagógico", detail: "Avanzado", score: 4 }], trainings: [{ title: "Feedback docente", detail: "APDES · 2026" }], evaluations: [{ title: "Evaluación de desempeño", detail: "Muy buen desempeño", score: 4 }], talentNotes: "Perfil con capacidad para asumir proyectos transversales." },
  { id: "demo-person-formacion", firstName: "Sofía", lastName: "Martínez", formalRole: "Coordinadora de Formación Integral", realFunction: "Articular tutorías, formación y acompañamiento de alumnos y familias.", weeklyHours: 32, potentialLevel: "MEDIO", competencies: [{ title: "Escucha y acompañamiento", detail: "Muy sólido", score: 4 }], trainings: [{ title: "Formación de tutores", detail: "APDES · 2025" }], evaluations: [{ title: "Evaluación anual", detail: "Buen desempeño", score: 3 }], talentNotes: "Conviene ampliar herramientas de gestión de proyectos." },
  { id: "demo-person-familia", firstName: "Carolina", lastName: "Pérez", formalRole: "Responsable de Familias", realFunction: "Diseñar la experiencia de incorporación y participación de las familias.", weeklyHours: 24, potentialLevel: "EN_DESARROLLO", competencies: [{ title: "Comunicación interpersonal", detail: "Sólido", score: 3 }], trainings: [{ title: "Conversaciones difíciles", detail: "APDES · 2026" }], evaluations: [], talentNotes: "Necesita completar la evaluación anual." },
  { id: "demo-person-comunicacion", firstName: "Valentina", lastName: "Ruiz", formalRole: "Responsable de Comunicación", realFunction: "Ordenar la comunicación institucional y acompañar eventos con familias.", weeklyHours: 20, potentialLevel: "MEDIO", competencies: [{ title: "Comunicación institucional", detail: "Sólido", score: 3 }], trainings: [], evaluations: [{ title: "Evaluación anual", detail: "Buen desempeño", score: 3 }], talentNotes: "Capacitación prioritaria: comunicación en situaciones sensibles." },
  { id: "demo-person-postulaciones", firstName: "Agustina", lastName: "López", formalRole: "Responsable de Postulaciones", realFunction: "Acompañar a las nuevas familias desde el primer contacto hasta su incorporación.", weeklyHours: 18, potentialLevel: "SIN_DEFINIR", competencies: [], trainings: [{ title: "Experiencia de familias", detail: "APDES · 2025" }], evaluations: [], talentNotes: "Ficha intencionalmente incompleta para demostrar las alertas." },
  { id: "demo-person-operaciones", firstName: "Pablo", lastName: "Sánchez", formalRole: "Administrador", realFunction: "Asegurar recursos, procesos administrativos y soporte operativo para los equipos.", weeklyHours: 40, potentialLevel: "CRITICO", competencies: [{ title: "Gestión operativa", detail: "Muy sólido", score: 4 }], trainings: [{ title: "Seguridad e infraestructura", detail: "2026" }], evaluations: [{ title: "Evaluación anual", detail: "Buen desempeño", score: 3 }], talentNotes: "Perfil crítico por concentración de conocimiento operativo. Requiere plan de respaldo." },
];

const nodes = [
  { id: "demo-node-direccion", title: "Dirección", area: "DIRECCION", personId: "demo-person-directora", x: 760, y: 40, color: "#1d4ed8", icon: "landmark", hours: 40 },
  { id: "demo-node-academica", title: "Coordinación Académica", area: "ACADEMICA", personId: "demo-person-academica", x: 220, y: 330, color: "#0f766e", icon: "graduation-cap", hours: 36 },
  { id: "demo-node-formacion", title: "Formación Integral", area: "FORMACION", personId: "demo-person-formacion", x: 650, y: 330, color: "#7c3aed", icon: "book-open", hours: 32 },
  { id: "demo-node-familia", title: "Familia", area: "FAMILIA", personId: "demo-person-familia", x: 1080, y: 330, color: "#d97706", icon: "users", hours: 24 },
  { id: "demo-node-comunicacion", title: "Comunicación", area: "COMUNICACION", personId: "demo-person-comunicacion", x: 0, y: 650, color: "#0284c7", icon: "megaphone", hours: 20 },
  { id: "demo-node-postulaciones", title: "Postulaciones", area: "POSTULACIONES", personId: "demo-person-postulaciones", x: 430, y: 650, color: "#be123c", icon: "pen-tool", hours: 18 },
  { id: "demo-node-operaciones", title: "Operaciones y Administración", area: "OPERACIONES", personId: "demo-person-operaciones", x: 860, y: 650, color: "#475569", icon: "building", hours: 40 },
];

const edges = [
  ["demo-edge-dir-aca", "demo-node-direccion", "demo-node-academica", "JERARQUICA", null],
  ["demo-edge-dir-for", "demo-node-direccion", "demo-node-formacion", "JERARQUICA", null],
  ["demo-edge-dir-fam", "demo-node-direccion", "demo-node-familia", "JERARQUICA", null],
  ["demo-edge-dir-ope", "demo-node-direccion", "demo-node-operaciones", "JERARQUICA", null],
  ["demo-edge-for-fam", "demo-node-formacion", "demo-node-familia", "TRANSVERSAL", "Acompañamiento de familias"],
  ["demo-edge-fam-com", "demo-node-familia", "demo-node-comunicacion", "COLABORACION", "Eventos y comunicación"],
  ["demo-edge-pos-com", "demo-node-postulaciones", "demo-node-comunicacion", "INFORMACION", "Nuevas familias"],
] as const;

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: "colegio-demostracion" },
    update: { name: "Colegio Demostración", city: "Tucumán", province: "Tucumán" },
    create: { id: "demo-school", name: "Colegio Demostración", slug: "colegio-demostracion", city: "Tucumán", province: "Tucumán" },
  });

  const chart = await prisma.orgChart.upsert({
    where: { id: "demo-org-2026" },
    update: { title: "Organigrama Institucional · Demostración 2026", status: "REVIEW", summary: "Estructura ficticia preparada para presentar el recorrido completo." },
    create: { id: "demo-org-2026", schoolId: school.id, title: "Organigrama Institucional · Demostración 2026", year: 2026, status: "REVIEW", summary: "Estructura ficticia preparada para presentar el recorrido completo." },
  });

  for (const person of people) {
    await prisma.person.upsert({
      where: { id: person.id },
      update: { ...person, schoolId: school.id },
      create: { ...person, schoolId: school.id, email: `${person.firstName.toLowerCase()}@demo.apdes.edu.ar` },
    });
  }

  for (const [index, node] of nodes.entries()) {
    const person = people.find((item) => item.id === node.personId)!;
    await prisma.orgNode.upsert({
      where: { id: node.id },
      update: { title: node.title, area: node.area as any, personId: node.personId, formalRole: person.formalRole, realFunction: person.realFunction, weeklyHours: node.hours, positionX: node.x, positionY: node.y, color: node.color, icon: node.icon, order: index + 1 },
      create: { id: node.id, orgChartId: chart.id, title: node.title, area: node.area as any, personId: node.personId, formalRole: person.formalRole, realFunction: person.realFunction, weeklyHours: node.hours, positionX: node.x, positionY: node.y, color: node.color, icon: node.icon, order: index + 1 },
    });
  }

  for (const [id, sourceId, targetId, type, label] of edges) {
    await prisma.orgEdge.upsert({
      where: { id },
      update: { sourceId, targetId, type: type as any, label },
      create: { id, orgChartId: chart.id, sourceId, targetId, type: type as any, label },
    });
  }

  await prisma.orgReviewNote.upsert({
    where: { id: "demo-review-concentracion" },
    update: { title: "Revisar continuidad operativa", body: "Operaciones concentra conocimiento crítico en una sola persona. Conviene definir respaldo y documentación." },
    create: { id: "demo-review-concentracion", orgChartId: chart.id, nodeId: "demo-node-operaciones", title: "Revisar continuidad operativa", body: "Operaciones concentra conocimiento crítico en una sola persona. Conviene definir respaldo y documentación." },
  });

  console.log("Demostración APDES cargada correctamente");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());

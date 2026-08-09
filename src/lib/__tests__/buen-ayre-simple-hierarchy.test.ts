import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBuenAyreSimpleHierarchy,
  normalizeBuenAyreTitle,
  type BuenAyreHierarchyNode,
} from "../buen-ayre-simple-hierarchy";

const node = (
  id: string,
  title: string,
  area = "ACADEMICA",
  positionX = 0,
  positionY = 0,
): BuenAyreHierarchyNode => ({ id, title, area, positionX, positionY });

const sample: BuenAyreHierarchyNode[] = [
  node("director", "Director General", "DIRECCION", 600, 0),
  node("council", "Consejo de Dirección", "DIRECCION", 600, 200),
  node("academic", "Área Académica", "ACADEMICA", 200, 500),
  node("academic-council", "Consejo Académico", "ACADEMICA", 200, 700),
  node("initial", "Dirección de Nivel Inicial", "ACADEMICA", 0, 900),
  node("primary", "Dirección de Nivel Primario", "ACADEMICA", 300, 900),
  node("secondary", "Dirección de Nivel Secundario", "ACADEMICA", 600, 900),
  node("initial-team", "Equipo Directivo Nivel Inicial", "ACADEMICA", 0, 1100),
  node("primary-team", "Equipo Directivo Nivel Primario", "ACADEMICA", 300, 1100),
  node("secondary-team", "Equipo Directivo Nivel Secundario", "ACADEMICA", 600, 1100),
  node("initial-docents", "Equipo Docente Inicial", "ACADEMICA", 0, 1300),
  node("primary-eoe", "EOE Primario", "ACADEMICA", 300, 1300),
  node("secondary-secretary", "Secretaría Académica Secundaria", "ACADEMICA", 600, 1300),
];

function parentMap(nodes: BuenAyreHierarchyNode[]) {
  return new Map(buildBuenAyreSimpleHierarchy(nodes).map((edge) => [edge.targetId, edge.sourceId]));
}

function assertAcyclic(nodes: BuenAyreHierarchyNode[]) {
  const parents = parentMap(nodes);
  for (const current of nodes) {
    const seen = new Set<string>();
    let id: string | undefined = current.id;
    while (id) {
      assert.equal(seen.has(id), false, `Ciclo detectado desde ${current.title}`);
      seen.add(id);
      id = parents.get(id);
    }
  }
}

test("normaliza acentos y separadores", () => {
  assert.equal(normalizeBuenAyreTitle("  Área—Académica  "), "area academica");
});

test("Buen Ayre deja los Equipos Directivos dentro de la jerarquía navegable", () => {
  const parents = parentMap(sample);
  assert.equal(parents.get("council"), "director");
  assert.equal(parents.get("academic"), "council");
  assert.equal(parents.get("academic-council"), "academic");
  assert.equal(parents.get("initial-team"), "initial");
  assert.equal(parents.get("primary-team"), "primary");
  assert.equal(parents.get("secondary-team"), "secondary");
  assert.equal(parents.get("initial-docents"), "initial-team");
  assert.equal(parents.get("primary-eoe"), "primary-team");
  assert.equal(parents.get("secondary-secretary"), "secondary-team");
});

test("cada caja tiene como máximo un superior jerárquico", () => {
  const links = buildBuenAyreSimpleHierarchy(sample);
  const targets = links.map((edge) => edge.targetId);
  assert.equal(new Set(targets).size, targets.length);
});

test("la jerarquía generada no contiene ciclos", () => {
  assertAcyclic(sample);
});

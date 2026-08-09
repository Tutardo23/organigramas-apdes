import assert from "node:assert/strict";
import test from "node:test";
import {
  countPucaraRelationsByView,
  pucaraRelationMatchesView,
  relatedPucaraNodeIds,
} from "../pucara-relations";

const relations = [
  { type: "DECISION", sourceId: "direccion", targetId: "academica" },
  { type: "COLABORACION", sourceId: "direccion", targetId: "familias" },
  { type: "COLABORACION", sourceId: "comunicacion", targetId: "direccion" },
  { type: "JERARQUICA", sourceId: "direccion", targetId: "primaria" },
  { type: "TRANSVERSAL", sourceId: "direccion", targetId: "sistemas" },
];

test("Todas incluye Integra y Colabora, pero nunca la jerarquía", () => {
  assert.equal(pucaraRelationMatchesView(relations[0], "all"), true);
  assert.equal(pucaraRelationMatchesView(relations[1], "all"), true);
  assert.equal(pucaraRelationMatchesView(relations[3], "all"), false);
  assert.equal(pucaraRelationMatchesView(relations[4], "all"), false);
});

test("Integra y Colabora se pueden filtrar por separado", () => {
  assert.equal(pucaraRelationMatchesView(relations[0], "integration"), true);
  assert.equal(pucaraRelationMatchesView(relations[1], "integration"), false);
  assert.equal(pucaraRelationMatchesView(relations[0], "collaboration"), false);
  assert.equal(pucaraRelationMatchesView(relations[1], "collaboration"), true);
});

test("los contadores reflejan solo vínculos transversales conocidos", () => {
  assert.deepEqual(countPucaraRelationsByView(relations), {
    all: 3,
    integration: 1,
    collaboration: 2,
  });
});

test("al enfocar una caja trae solo las cajas relacionadas del filtro activo", () => {
  assert.deepEqual(
    [...relatedPucaraNodeIds(relations, "direccion", "integration")].sort(),
    ["academica"],
  );
  assert.deepEqual(
    [...relatedPucaraNodeIds(relations, "direccion", "collaboration")].sort(),
    ["comunicacion", "familias"],
  );
  assert.deepEqual(
    [...relatedPucaraNodeIds(relations, "direccion", "all")].sort(),
    ["academica", "comunicacion", "familias"],
  );
});

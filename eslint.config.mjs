import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // La aplicación nueva (Pucará / Buen Ayre simple) mantiene las reglas estrictas.
  // El código institucional anterior sigue incluido, pero sus deudas históricas se
  // reportan como warnings para poder sanearlas por etapas sin bloquear CI/build.
  {
    files: [
      "prisma/seed.ts",
      "src/app/organigramas/*/editar/actions.ts",
      "src/app/organigramas/*/explorar/page.tsx",
      "src/app/organigramas/*/page.tsx",
      "src/app/organigramas/actions.ts",
      "src/app/talento/**/*.ts",
      "src/app/talento/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: [
      "src/components/organigramas/InstitutionalOrgChartEditor.tsx",
      "src/components/organigramas/OrgChartCanvas.tsx",
      "src/components/organigramas/OrgNodeCard.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "backups/**",
    "patches/**",
    "organigramas-apdes-*/**",
    "**/*.bak",
    "**/*.backup*",
  ]),
]);

export default eslintConfig;

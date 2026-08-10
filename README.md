# Organigramas APDES

Plataforma web para crear, visualizar y editar organigramas institucionales de colegios APDES.

## Experiencia principal

El sistema utiliza **HITO / PucaraOrgChart** como experiencia unica del organigrama:

- modo **Ver** con navegacion progresiva;
- modo **Editar** sobre la misma estructura;
- dependencias jerarquicas;
- relaciones **Integra / Colabora / Todas**;
- personas y equipos por funcion;
- posiciones persistentes;
- soporte para Pucara, El Buen Ayre y nuevos colegios;
- editor guiado para usuarios no tecnicos.

El stack institucional anterior fue retirado del codigo activo.

## Stack

- Next.js 16 con App Router
- TypeScript
- React 19
- Tailwind CSS
- Prisma + Neon PostgreSQL
- Clerk
- XYFlow / React Flow

## Desarrollo

```powershell
npm install
npm run dev
```

Aplicacion local:

```text
http://localhost:3000
```

## Controles antes de publicar

```powershell
npm run check
```

El control completo incluye:

- proteccion de la ruta HITO;
- validacion del stack activo;
- limpieza del release;
- TypeScript;
- ESLint con 0 warnings;
- tests;
- build de produccion.

Tambien pueden ejecutarse individualmente:

```powershell
npm run guard:hito
npm run guard:active-stack
npm run guard:release
npm run typecheck
npm run lint
npm run test
npm run build
```

## Flujo Git

La rama estable es `main`.

Los cambios grandes se desarrollan en ramas `feature/*`, se validan con `npm run check` y luego se integran mediante Pull Request.

## Proxima etapa

El siguiente modulo sera un **asistente guiado de creacion de organigramas** para acelerar la carga de decenas de colegios sin exigir conocimientos tecnicos.

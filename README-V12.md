# V12 — saneamiento grande

Objetivo: dejar de parchear warning por warning y retirar del stack activo el editor/canvas institucional viejo que ya fue reemplazado por la experiencia HITO/Pucará.

## Qué hace

- Mantiene `/organigramas/[schoolSlug]` en `PucaraOrgChart` (HITO).
- `/editar`, `/pucara` y `/explorar` redirigen a la misma experiencia HITO.
- Archiva fuera de `src` (no elimina definitivamente):
  - `InstitutionalOrgChartEditor.tsx`
  - `OrgChartCanvas.tsx`
  - `OrgChartEditor.tsx`
  - `LegacyOrgChartCanvas.tsx`
- Antes de archivarlos, busca referencias activas. Si encuentra alguna inesperada, se detiene y no hace el archivado.
- Corrige el componente dinámico de `OrgNodeCard.tsx` usando `createElement`.
- Elimina dos imports muertos de `TalentDashboard.tsx`.
- Agrega guards HITO/stack activo y hace que `lint` exija `--max-warnings=0`.
- Ejecuta automáticamente: guards, typecheck, lint, tests y build.
- Crea backup en `backups/v12-pre-clean` y preserva los archivos viejos en `legacy/organigramas/pre-v12`.

## Aplicación

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File `.\organigramas-apdes-v12-saneamiento-grande\apply-v12.ps1`
```

No hace falta correr después cinco comandos: el instalador ejecuta los controles completos por sí solo.

## Resultado esperado

- HITO Ver/Editar protegido.
- 0 warnings en `npm run lint` (el propio script falla si queda alguno).
- 4 tests pasando.
- build de producción pasando.

## Rollback

```powershell
powershell -ExecutionPolicy Bypass -File `.\organigramas-apdes-v12-saneamiento-grande\rollback-v12.ps1`
```

# V12.1 — saneamiento grande universal

Misma V12 grande, con instalador corregido para la estructura real del proyecto.

Soporta:
1. Carpeta `organigramas-apdes-v12.1...` dentro de la raíz del proyecto.
2. Contenido del paquete copiado directamente dentro de la raíz.

El instalador detecta la raíz, evita `Copy-Item` sobre el mismo archivo, conserva el backup previo, archiva el stack viejo fuera de `src`, instala los guards, exige lint con 0 warnings y corre typecheck + lint + tests + build.

No modifica `PucaraOrgChart.tsx` ni la ruta principal HITO.

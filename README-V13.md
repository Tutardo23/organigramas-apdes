# V13 — HITO funcional

Esta versión parte de la base V12.1 ya saneada y mantiene HITO/Pucará como única experiencia activa.

## Qué cambia

1. **Filtros reales de vínculos en la vista**
   - Todas
   - Integra
   - Colabora
   - El filtro cambia qué cajas relacionadas aparecen, qué tarjetas brillan y qué flechas se muestran.
   - La jerarquía normal no se modifica.

2. **Relaciones editables sin borrar y volver a crear**
   - En la pestaña Vínculos se puede cambiar un vínculo de Integra a Colabora o viceversa.
   - Se evita duplicar el mismo vínculo entre dos cajas.
   - Se puede tocar la caja relacionada para navegar directamente hacia ella.

3. **Personas más rápidas de cargar**
   - Al elegir una persona ya existente, el formulario completa automáticamente nombre, apellido, correo y foto.
   - Funciona para Responsable y para integrantes del Equipo.
   - Evita duplicados y carga manual repetida.

4. **Persistencia de posiciones más segura**
   - Arrastrar una caja sigue guardando su posición automáticamente.
   - Si falla la escritura en base de datos, la tarjeta vuelve a la posición anterior para que la UI no quede mintiendo.
   - Auto ordenar también vuelve al diseño previo si no logra guardar.

5. **Tests nuevos**
   - Todas excluye la jerarquía.
   - Integra y Colabora se filtran por separado.
   - Contadores correctos.
   - Al enfocar una caja se traen únicamente las relacionadas por el filtro activo.

## Cómo aplicarla con tu forma de trabajar

Podés abrir el ZIP y copiar **todo su contenido** directamente dentro de:

`F:\.cositas\organigramas-apdes`

Después, desde PowerShell parado en esa carpeta:

```powershell
powershell -ExecutionPolicy Bypass -File ".\apply-v13.ps1"
```

El instalador detecta si está en la raíz del proyecto o dentro de una carpeta de versión, hace backup y ejecuta automáticamente:

- guard:hito
- guard:active-stack
- typecheck
- lint
- test
- build

No necesitás correrlos uno por uno.

## Rollback

```powershell
powershell -ExecutionPolicy Bypass -File ".\rollback-v13.ps1"
```

El backup queda en `backups/v13-pre-functional`.

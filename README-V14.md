# V14 — Editor guiado HITO

Objetivo: que una directora/coordinadora que usa la herramienta de vez en cuando pueda crear y editar sin conocer conceptos técnicos.

## Cambios
- Modo simple activado por defecto.
- Guía rápida al entrar a Editar y botón para volver a abrirla.
- Acciones principales visibles: Agregar función, Agregar persona, Agregar vínculo.
- Herramientas técnicas pasan a “Más opciones”.
- Editor en 3 pasos: Datos → Personas → Vínculos, con indicadores ✓.
- Datos esenciales primero; área, descripción, horas, correo y foto quedan en “Más información (opcional)”.
- Creación de funciones con lenguaje más simple.
- Integra / Colabora se eligen con dos tarjetas explicadas, no con un selector técnico.
- Fotos: ayuda simple primero y explicación técnica desplegable.
- Confirmación antes de eliminar un vínculo.
- HITO/Pucará, jerarquía, posiciones, personas y relaciones existentes se conservan.

## Instalación según tu forma de trabajar
Abrí el ZIP y copiá todo el contenido dentro de la raíz de `organigramas-apdes`, aceptando reemplazar `apply-v14.ps1` si Windows pregunta.

Luego ejecutá:

```powershell
powershell -ExecutionPolicy Bypass -File ".\apply-v14.ps1"
```

El instalador crea backup y corre automáticamente guards, TypeScript, ESLint, tests y build.

## Rollback
```powershell
powershell -ExecutionPolicy Bypass -File ".\rollback-v14.ps1"
```

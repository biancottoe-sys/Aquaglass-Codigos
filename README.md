# Aquaglass Codificador

Configurador maestro de productos Aquaglass hecho como sitio estático. Permite elegir familia, modelo y variantes para generar el código técnico final, la descripción comercial y un historial local exportable.

## Cómo abrir localmente

Abrí `index.html` directamente en el navegador.

También podés servir la carpeta con cualquier servidor estático si querés probarlo como en GitHub Pages, pero no es obligatorio.

## Cómo subir a GitHub Pages

1. Subí la carpeta `aquaglass-codificador` a un repositorio de GitHub.
2. En GitHub, entrá a `Settings > Pages`.
3. Elegí la rama donde está el proyecto.
4. Seleccioná la carpeta raíz del sitio.
5. Guardá la configuración y esperá a que GitHub publique la URL.

## Estructura

```text
aquaglass-codificador/
  index.html
  README.md
  css/styles.css
  js/app.js
  data/database.json
  assets/logo.png
  assets/placeholder-product.png
```

## Cómo editar `database.json`

Toda la información comercial y técnica vive en `data/database.json`: categorías, modelos, campos, opciones y orden del código. El JavaScript lee esa base y arma la interfaz automáticamente.

Para cambiar nombres, códigos o textos, editá el JSON y guardá. Al recargar la página se verán los cambios.

## Cómo trabajar la maestra desde la web

La página incluye el botón `Trabajar maestra`. Desde ahí podés:

- Agregar modelos nuevos por categoría.
- Modificar modelos existentes.
- Eliminar modelos.
- Agregar variantes nuevas, como medidas, colores, materiales o equipamientos.
- Modificar variantes existentes.
- Eliminar variantes.
- Exportar la maestra en JSON.
- Restaurar la base original.

Los cambios se guardan en el navegador con `localStorage` y se reflejan al instante en el configurador. Como el sitio es estático, el navegador no puede reescribir `data/database.json` directamente. Para fijar una maestra definitiva, exportá el JSON desde la web y usalo para reemplazar `data/database.json`.

## Cómo agregar una categoría nueva

1. En `categories`, duplicá una categoría existente.
2. Cambiá `id`, `code`, `displayCode`, `name`, `singularName` y `description`.
3. Definí sus `models`.
4. Definí los `fields` que aplican a esa familia.
5. Ajustá `codeOrder` con el orden exacto del código final.

Cada campo debe apuntar a una lista de opciones con `source`. Puede ser `models` o una lista dentro de `sharedOptions`.

## Cómo agregar un modelo nuevo

En la categoría correspondiente, sumá una entrada dentro de `models`:

```json
{ "code": "NUE", "name": "Nuevo Modelo" }
```

Al recargar, el modelo aparecerá automáticamente como opción.

## Cómo agregar una medida nueva

En `sharedOptions.medidas`, agregá una entrada:

```json
{ "code": "180090", "name": "180 x 90 cm" }
```

El valor `name` es lo que ve el usuario. El valor `code` es lo que entra en el código técnico.

## Historial y exportación

El historial usa `localStorage`, por lo que queda guardado en el navegador del usuario. Guarda hasta 100 configuraciones y permite buscar, copiar códigos, eliminar registros, vaciar todo y exportar en CSV o JSON.

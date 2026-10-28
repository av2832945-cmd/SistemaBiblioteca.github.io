# Biblioteca

Abre `index.html` en el navegador. No requiere instalar paquetes ni iniciar un servidor.

## ¿Dónde modificar cada cosa?

| Archivo | Contenido |
| --- | --- |
| `index.html` | Estructura de las pantallas y formularios. |
| `styles/base.css` | Colores, tipografías, botones y elementos comunes. |
| `styles/login.css` | Pantalla de acceso e ilustración de libros. |
| `styles/estructura.css` | Navegación, buscadores y distribución general. |
| `styles/libros.css` | Fichas de libros y disponibilidad. |
| `styles/formularios.css` | Paneles de registro y edición. |
| `styles/usuarios.css` | Carnés de lectores e historial. |
| `styles/prestamos.css` | Formulario y tarjetas de préstamos. |
| `styles/reportes.css` | Indicadores y gráficos de reportes. |
| `styles/responsive.css` | Ajustes para móviles y otras pantallas. |
| `js/datos.js` | Datos iniciales y guardado en `localStorage`. |
| `js/utilidades.js` | Funciones compartidas de búsqueda, mensajes y fechas. |
| `js/libros.js` | Registro, búsqueda, edición y eliminación de libros. |
| `js/usuarios.js` | Registro, búsqueda, edición e historial de lectores. |
| `js/login.js` | Inicio y cierre de sesión de demostración. |
| `js/prestamos.js` | Registro, devolución y consulta de préstamos. |
| `js/reportes.js` | Estadísticas de la biblioteca. |
| `js/exportar-reporte.js` | Composición y descarga del reporte en PDF. |
| `vendor/pdf-lib.min.js` | Biblioteca local para generar el PDF (licencia MIT en `vendor/`). |
| `js/app.js` | Navegación, eventos de botones/formularios e inicio de la aplicación. |

Los archivos JavaScript comparten las variables y funciones declaradas a nivel superior.
Mantén el orden de los `<script defer>` en `index.html`: pdf-lib, datos, utilidades, libros, usuarios, login, préstamos, reportes, exportar-reporte y app.
`responsive.css` se carga al final para ajustar los estilos de los módulos.

El correo de demostración es `lector@biblioteca.com` y la clave es `biblioteca123`.
El login no es una autenticación real; los datos permanecen en el navegador.
La organización conserva la clave de almacenamiento anterior (`biblioteca-v1`).

Los préstamos nuevos incluyen fecha límite; los registros antiguos sin esa fecha se muestran como tales. El botón Exportar PDF descarga el reporte directamente y funciona sin conexión.

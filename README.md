# NEXO · Casa Nexo

Plantilla editable de domótica para proyectos estudiantiles, hecha con **HTML5, CSS y JavaScript**, sin dependencias. El diseño se adapta a computadores, tabletas y móviles.

## Empezar

Abre `index.html` en un navegador moderno. No necesitas instalar paquetes ni compilar.

| Archivo | Qué puedes personalizar |
| --- | --- |
| `index.html` | Estructura, textos fijos, secciones y formularios. |
| `styles.css` | Colores, tipografías, espacios, tarjetas y adaptación a pantallas. |
| `app.js` | Datos iniciales, sensores, simulación y comportamiento de los controles. |

## Preparar tu proyecto

1. Usa **Editar proyecto** para cambiar el nombre, el equipo, el curso y la descripción.
2. Edita las tarjetas de sensores para cambiar nombre, habitación, tipo, unidad, lectura y límites. También puedes agregar o eliminar sensores.
3. Desactiva la simulación cuando quieras conservar las lecturas que introduzcas manualmente.
4. Prueba las escenas y los controles de iluminación, clima y seguridad.
5. Exporta la configuración a un archivo JSON para entregarla en clase o compartirla. En otro navegador, impórtala para recuperar la configuración.

Las lecturas deben ser números finitos dentro del intervalo mínimo–máximo configurado; el mínimo debe ser menor que el máximo. Los sensores de movimiento utilizan `0` y `1`.

**Esta plantilla es una demostración.** Las lecturas automáticas, las escenas y los actuadores están simulados. No hay una conexión activa a sensores físicos, relés ni dispositivos domésticos.

## Guardado y traslado

Los cambios se guardan con `localStorage` en el navegador y dispositivo actuales. No se sincronizan entre estudiantes ni se envían a un servidor. Conserva una exportación JSON como copia de tu trabajo; el historial visual de las gráficas no es un registro permanente.

La importación carga datos de configuración, no código HTML ni JavaScript. Revisa los mensajes de validación si un archivo no se puede importar.

Al abrir archivos directamente con `file://`, el comportamiento del almacenamiento puede variar entre navegadores. Si no se conservan los cambios, puedes usar un servidor local. Si ya tienes Python instalado, abre una terminal en la carpeta de la plantilla y ejecuta:

```powershell
python -m http.server 5500
```

Después visita <http://localhost:5500>. Mantén la terminal abierta mientras trabajas y pulsa `Ctrl+C` para detenerla. Esta opción no es necesaria para editar los archivos.

## Conectar sensores reales más adelante

La página expone una API sencilla en el navegador:

```js
// Consulta el estado y usa el id real de un sensor de tu proyecto.
const estado = window.Nexo.getState();
const sensor = estado.sensors[0];

// Envía una lectura numérica válida para los límites de ese sensor.
window.Nexo.updateSensor(sensor.id, 25);
```

Desactiva la simulación antes de suministrar lecturas externas. Usa un identificador existente y respeta el tipo y los límites del sensor; adapta el valor del ejemplo si tu sensor usa otro intervalo.

Para recibir datos de una placa o un servicio necesitarás desarrollar tu propia conexión y, cuando corresponda, un servidor. No se incluye ese backend. Mantén las contraseñas, claves de API y credenciales fuera de `index.html`, `styles.css` y `app.js`; gestiona los secretos en el servidor que implemente tu equipo.

## Sugerencia para clase

Cada equipo puede renombrar su proyecto, definir sensores para sus habitaciones, modificar los colores y entregar tanto los archivos editados como su configuración JSON. Antes de presentar, prueba la vista móvil, recarga la página y comprueba que la configuración guardada y los controles funcionen como esperas.

CALCULADORA DE PAELLA VALENCIANA (PWA)
======================================

QUE ES
App web instalable, sin dependencias ni servidor, basada en la guia
"Paella valenciana tradicional: guia definitiva". Cambias ingredientes, paella,
fuente de calor, altitud, agua, etc. y recalcula en vivo: arroz, diametro de
paella, agua, tiempos, plan de fuego, cronograma, lista de compra y avisos.

ARCHIVOS
  index.html            interfaz y estilos
  app.js                formulario (por esquema), resultados, perfiles, fichas
  engine.js             motor de calculo (secciones 13-14 de la guia)
  sw.js                 service worker (funciona sin conexion)
  manifest.webmanifest  datos de instalacion
  icon.svg, icons/      iconos
  tests/engine.test.js  pruebas del motor (node tests/engine.test.js)
  tools/make_icons.py   regenera los iconos PNG (Pillow)

COMO USARLA
  Opcion A - sin instalar: abrir paella-standalone.html con doble clic.
             Funciona pero NO se puede instalar como app (los navegadores
             exigen https o localhost para instalar).
  Opcion B - instalable (recomendada): subir TODA la carpeta a un hosting https,
             por ejemplo GitHub Pages (Settings > Pages > rama main, carpeta /root).
             Abrir la URL: Chrome/Edge/Android muestran el boton "Instalar";
             en iPhone: Compartir > "Anadir a pantalla de inicio".
  Prueba local: en la carpeta, ejecutar   python3 -m http.server 8000
                y abrir http://localhost:8000

ACTUALIZAR TRAS CAMBIAR ARCHIVOS
  En sw.js, subir el numero de VERSION (paella-v1 -> paella-v2) para que los
  dispositivos reciban la version nueva.

DATOS GUARDADOS (solo en tu navegador, localStorage)
  paella.state.v1     valores actuales
  paella.profiles.v1  perfiles con nombre (tu paella + tu fuego)
  paella.fichas.v1    fichas de calibracion
  Menu > Exportar JSON / Importar JSON para copias de seguridad.

ETIQUETAS DE EVIDENCIA (como en la guia)
  F = dato de fuente citada
  P = practica extendida sin cifra oficial
  I = inferencia: punto de partida que hay que calibrar con tu paella

DECISIONES DONDE LA GUIA ERA AMBIGUA
  - Punto del grano: "al dente firme" = 0 min, "tierno" = +1 min (asi cuadra con
    el ejemplo resuelto de la seccion 17; la tabla 13-H decia -1/+1).
  - Agua blanda/media resta tiempo a todas las variedades menos la Bomba.
  - Los hornos "terminar" y "todo" se eligen en Fuente de calor (no hay campo
    horno_modo aparte).
  - Cantidades de pato, costilla, tavella, habas y ajo no estan en la guia:
    son estimaciones marcadas [I].
  - Altitudes de ciudades aproximadas; dureza del agua solo para Sevilla y
    Valencia (datos de la guia).

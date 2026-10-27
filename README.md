# Feria de Seguridad SAESA

Aplicación web para consultar las empresas y stands, revisar el programa de
charlas, registrar visitas para el concurso y jugar a encontrar riesgos en una
imagen.

## Requisitos y desarrollo local

- Node.js compatible con Next.js 16.
- Un proyecto Supabase con las tablas usadas por la aplicación: `events`,
  `companies`, `stands`, `talks`, `participants`, `stand_visits` y
  `contest_entries`.

1. Instala dependencias: `npm install`.
2. Copia `.env.example` a `.env.local` y completa las variables.
3. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Datos en producción (Vercel)

Las páginas del inicio y de stands consultan Supabase en cada solicitud para
reflejar los cambios sin necesitar una nueva compilación. Si los datos aparecen
en desarrollo, pero no en producción, verifica en las variables del proyecto
Vercel que `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` correspondan al mismo proyecto Supabase
que usa `.env.local`. Revisa el entorno correcto (Production o Preview) y vuelve
a desplegar después de cambiar una variable. Una empresa se muestra en stands
cuando tiene un stand asociado al evento activo; en «Encuentra una empresa» se
muestran los stands ubicados en el plano.

## Panel de administración

El panel está en `/admin` y no aparece en la navegación pública. La ruta no es
un mecanismo de seguridad: las operaciones se protegen con una sesión firmada,
cookie `HttpOnly` y comprobación de origen.

1. Ejecuta las migraciones SQL de `supabase/migrations` en orden en el editor
   SQL de Supabase. Las migraciones preparan el juego, sus intentos, el ranking
   y las dos sesiones, sincronizan la secuencia de IDs de empresas y agregan
   las áreas de ubicación de stands al plano. La migración
   `20261020170000_company_links_and_unique_participant_names.sql` agrega los
   enlaces web y redes sociales de empresas, y permite que el registro requiera
   solo un nombre único. Si ya hay participantes con nombres repetidos
   (ignorando mayúsculas y espacios al inicio o al final), resuelve esos
   duplicados antes de aplicar esa migración. La migración
   `20261022180000_company_linkedin_url.sql` agrega el campo de LinkedIn y
   reubica allí los enlaces de LinkedIn que estén guardados actualmente como
   YouTube, conservando los enlaces reales de YouTube. Si ya aplicaste algunas
   migraciones, ejecuta solo las que falten y en orden; para habilitar LinkedIn,
   aplica `20261022180000_company_linkedin_url.sql`. Para registrar visitas
   anónimas y tiempos de carga de páginas, aplica también
   `20261026154000_page_analytics.sql`.
2. Configura `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y en las variables
   privadas del entorno de despliegue. No debe tener el prefijo `NEXT_PUBLIC_`
   ni exponerse al navegador.
3. Define `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` (mínimo
   32 caracteres aleatorios). No uses los valores de ejemplo.
4. Reinicia la aplicación y entra a `/admin`.

El panel permite agregar y modificar empresas con su página web y enlaces
opcionales a Instagram, Facebook, LinkedIn y YouTube, administrar stands y
actividades de la feria activa, subir logos JPG, PNG o WebP de hasta 5 MB para
las empresas y configurar varias imágenes para el juego. Los logos se guardan
en el bucket público de Supabase Storage `feria-game-images`, que debe estar
disponible junto con el almacenamiento de imágenes del juego. No se puede
eliminar una empresa mientras tenga stands, actividades o productos asociados.
En la pestaña de stands, usa «Ubicar en plano» y arrastra sobre el mapa para
marcar el área de cada stand. La primera mitad de las imágenes se asigna a la
mañana y la segunda a la tarde; si el total es impar, la mañana recibe una
imagen adicional. El administrador habilita manualmente una sesión a la vez y
debe cerrarla antes de abrir la otra. Los intentos ya iniciados pueden terminar
después del cierre.

Las secciones «Resultados» y «Rendimiento» muestran a quienes completaron los
stands participantes, el ranking del juego, la actividad de la feria y las
visitas y tiempos de carga observados en la página. La medición usa un
identificador aleatorio guardado en el navegador; la tabla de métricas no guarda
nombres, correo, dirección IP ni agente de usuario. Los límites de capacidad y
usuarios simultáneos del proveedor no se consultan desde la aplicación; deben
revisarse en los paneles de Vercel y Supabase.

El registro al concurso se inicia escaneando el QR de un stand participante.
Si la persona aún no está registrada, ingresa un nombre único después del
escaneo y la visita al stand queda guardada. No se solicita correo electrónico
ni teléfono. Si ya está registrada, el escaneo agrega la visita directamente.
La página del concurso no ofrece el formulario de registro sin un stand
asociado al QR.

El plano público muestra las áreas pendientes de visita en amarillo y las
visitadas en verde para el participante de la sesión actual. La ficha de cada
stand incluye el plano con su ubicación resaltada.

El juego de `/imagen` exige que el participante se registre en `/concurso`.
Cada persona tiene un intento por sesión, con puntaje y cronómetro acumulados
para todas las imágenes de esa sesión. Cada acierto suma 100 puntos; los
primeros tres fallos no descuentan y cada fallo adicional resta 10. El ranking
de `/concurso` es una tabla combinada con la sesión indicada en cada resultado,
ordenada por puntaje y luego por menor tiempo.

## Comandos

- `npm run dev`: servidor de desarrollo.
- `npm run lint`: ESLint.
- `npm run build`: compilación de producción.

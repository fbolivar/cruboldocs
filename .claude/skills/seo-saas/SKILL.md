---
name: seo-saas
description: SEO técnico y de contenido para SaaS en Next.js — metadata, Open Graph, sitemap, robots, schema.org, headings y Core Web Vitals. Usar al crear páginas públicas y en el checklist de pre-lanzamiento.
---

# SEO SaaS

## Alcance
Aplica a páginas públicas (landing, precios, blog, docs). Las rutas privadas `/app/**` llevan `robots: noindex`.

## 1. Metadata (Next.js Metadata API)
Por cada página pública, exportar `metadata` (o `generateMetadata`):
- `title` único, < 60 caracteres, patrón "Beneficio | Producto".
- `description` < 155 caracteres, con el problema/beneficio y una razón para hacer clic.
- `openGraph` (title, description, image 1200x630, url, siteName, locale es_CO/es_LA) + `twitter` card `summary_large_image`.
- `alternates.canonical` en todas.
- En `layout.tsx` raíz: `metadataBase` con el dominio de producción.

## 2. Archivos técnicos
- `app/sitemap.ts`: todas las públicas con `lastModified`.
- `app/robots.ts`: allow público, disallow `/app`, referencia al sitemap.
- Favicon + `icon.png` + `apple-icon.png`.

## 3. Datos estructurados (JSON-LD)
- Landing: `Organization` + `SoftwareApplication` (con `offers` si hay precio público).
- Precios: `Product`/`Offer`. FAQ: `FAQPage`. Blog: `Article` con autor y fechas.
- Inyectar con `<script type="application/ld+json">` en el server component.

## 4. Contenido y estructura
- Un solo H1 por página, con la palabra clave principal; jerarquía H2/H3 sin saltos.
- Palabras clave: en español, orientadas al problema ("control de vencimientos de pólizas") y al mercado LatAm; mapear 1 keyword principal + 2-3 secundarias por página.
- Todas las imágenes con `alt` descriptivo; enlaces internos entre landing ↔ precios ↔ blog.

## 5. Performance (Core Web Vitals)
- `next/image` para toda imagen; fuentes con `next/font`.
- Lighthouse en la landing: Performance y SEO ≥ 90 antes de lanzar; reportar lo que quede fuera.

## Checklist de salida
- [ ] Title y description únicos en todas las públicas
- [ ] OG image renderiza bien al compartir (probar con un validador)
- [ ] sitemap.xml y robots.txt accesibles en producción
- [ ] JSON-LD válido (sin errores en Rich Results Test)
- [ ] /app con noindex

"use client";

import { useEffect, useState } from "react";

type GalleryPhoto = {
  path: string;
  url: string;
  createdAt: string | null;
};

export default function HomeGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/gallery", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as {
          photos?: GalleryPhoto[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error ?? "No fue posible cargar la galería.");
        }
        if (active) setPhotos(result.photos ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar la galería.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="galeria" className="scroll-mt-8 py-12">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-sky-700">
          Así vivimos la feria
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Galería de fotos
        </h2>
      </div>

      {loading ? (
        <p className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
          Cargando fotografías...
        </p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-6 text-sm text-red-800"
        >
          {error}
        </p>
      ) : photos.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
          Próximamente compartiremos fotografías de la feria.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.path}
              className="group overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200"
            >
              {/* Storage images use a runtime-configured host, so render them without Next's remote image loader. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Fotografía de la Feria de Seguridad SAESA"
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

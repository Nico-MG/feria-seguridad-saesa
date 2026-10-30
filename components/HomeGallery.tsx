"use client";

import { useEffect, useState } from "react";

type GalleryPhoto = {
  path: string;
  url: string;
  createdAt: string | null;
};

export default function HomeGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function downloadSelectedPhotos() {
    photos
      .filter((photo) => selectedPaths.includes(photo.path))
      .forEach((photo) => {
        const link = document.createElement("a");
        link.href = `/api/gallery/download?path=${encodeURIComponent(photo.path)}`;
        link.download = "";
        link.click();
      });
  }

  const allSelected =
    photos.length > 0 && selectedPaths.length === photos.length;

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
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelectedPaths(
                    allSelected ? [] : photos.map((photo) => photo.path),
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-sky-700"
              />
              Seleccionar todas
            </label>
            <button
              type="button"
              disabled={selectedPaths.length === 0}
              onClick={downloadSelectedPhotos}
              className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Descargar seleccionadas ({selectedPaths.length})
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <figure
                key={photo.path}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <label className="relative block cursor-pointer overflow-hidden bg-slate-100">
                  {/* Storage images use a runtime-configured host, so render them without Next's remote image loader. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Fotografía de la Feria de Seguridad SAESA"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition duration-300 hover:scale-[1.03]"
                  />
                  <span className="absolute left-3 top-3 rounded-md bg-white/95 p-1.5 shadow">
                    <input
                      type="checkbox"
                      checked={selectedPaths.includes(photo.path)}
                      onChange={() =>
                        setSelectedPaths((current) =>
                          current.includes(photo.path)
                            ? current.filter((path) => path !== photo.path)
                            : [...current, photo.path],
                        )
                      }
                      aria-label="Seleccionar foto para descargar"
                      className="h-4 w-4 rounded border-slate-300 text-sky-700"
                    />
                  </span>
                </label>
                <figcaption className="p-3">
                  <a
                    href={`/api/gallery/download?path=${encodeURIComponent(photo.path)}`}
                    download
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                  >
                    Descargar foto
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

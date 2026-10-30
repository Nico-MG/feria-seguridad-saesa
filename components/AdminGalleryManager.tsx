"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

type GalleryPhoto = {
  path: string;
  url: string;
  createdAt: string | null;
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const DELETE_BATCH_SIZE = 1000;

async function responseError(response: Response) {
  const result = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "La operación no se pudo completar.");
  }
}

async function requestGalleryPhotos() {
  const response = await fetch("/api/gallery", { cache: "no-store" });
  const result = (await response.json()) as {
    photos?: GalleryPhoto[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(result.error ?? "No fue posible cargar las fotos.");
  }
  return result.photos ?? [];
}

export default function AdminGalleryManager() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPhotos(await requestGalleryPhotos());
      setSelectedPaths([]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar las fotos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void requestGalleryPhotos()
      .then((result) => {
        if (active) setPhotos(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar las fotos.",
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

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setNotice(null);

    const invalidFiles = files.filter(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size === 0 ||
        file.size > MAX_FILE_SIZE,
    );
    if (invalidFiles.length > 0) {
      setError(
        `${invalidFiles.map((file) => file.name).join(", ")}: usa fotos JPG, PNG o WebP de hasta 4 MB cada una.`,
      );
      return;
    }

    setUploading(true);
    let uploadedCount = 0;
    const failures: string[] = [];

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`Subiendo ${index + 1} de ${files.length}: ${file.name}`);
        const formData = new FormData();
        formData.append("photo", file);

        try {
          const response = await fetch("/api/admin/gallery", {
            method: "POST",
            body: formData,
          });
          await responseError(response);
          uploadedCount += 1;
        } catch (uploadError) {
          failures.push(
            `${file.name}: ${
              uploadError instanceof Error
                ? uploadError.message
                : "No fue posible subirla."
            }`,
          );
        }
      }

      if (uploadedCount > 0) {
        setNotice(
          `${uploadedCount} ${uploadedCount === 1 ? "foto subida" : "fotos subidas"} correctamente.`,
        );
        await loadPhotos();
      }
      if (failures.length > 0) {
        setError(`No se pudieron subir ${failures.length} fotos. ${failures.join(" · ")}`);
      }
    } finally {
      setUploading(false);
      setProgress("");
    }
  }

  function togglePhoto(path: string) {
    setSelectedPaths((current) =>
      current.includes(path)
        ? current.filter((selectedPath) => selectedPath !== path)
        : [...current, path],
    );
  }

  async function deleteSelectedPhotos() {
    if (selectedPaths.length === 0) return;
    const pathsToDelete = [...selectedPaths];
    if (
      !window.confirm(
        `¿Eliminar ${pathsToDelete.length} ${
          pathsToDelete.length === 1 ? "foto seleccionada" : "fotos seleccionadas"
        }? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    setNotice(null);
    let deletedCount = 0;
    try {
      for (
        let start = 0;
        start < pathsToDelete.length;
        start += DELETE_BATCH_SIZE
      ) {
        const batch = pathsToDelete.slice(start, start + DELETE_BATCH_SIZE);
        const response = await fetch("/api/admin/gallery", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: batch }),
        });
        await responseError(response);
        deletedCount += batch.length;
      }
      setNotice(
        `${deletedCount} ${
          deletedCount === 1 ? "foto eliminada" : "fotos eliminadas"
        } correctamente.`,
      );
      await loadPhotos();
    } catch (deleteError) {
      if (deletedCount > 0) {
        setNotice(
          `${deletedCount} ${
            deletedCount === 1 ? "foto eliminada" : "fotos eliminadas"
          } antes de que ocurriera un error.`,
        );
        await loadPhotos();
      }
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No fue posible eliminar las fotos.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const allSelected =
    photos.length > 0 && selectedPaths.length === photos.length;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold text-slate-900">
          Administrar galería
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Sube varias fotos a la vez o selecciona múltiples imágenes para
          eliminarlas. Formatos JPG, PNG y WebP; máximo 4 MB por foto.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            {uploading ? progress : "Subir fotos"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading || deleting}
              onChange={(event) => void uploadPhotos(event)}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            disabled={selectedPaths.length === 0 || uploading || deleting}
            onClick={() => void deleteSelectedPhotos()}
            className="rounded-xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "Eliminando..."
              : `Eliminar seleccionadas (${selectedPaths.length})`}
          </button>
          <span className="text-sm text-slate-500">
            {photos.length} {photos.length === 1 ? "foto" : "fotos"}
          </span>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 ring-1 ring-red-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800 ring-1 ring-green-200"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
          Cargando galería...
        </p>
      ) : photos.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
          Todavía no hay fotos en la galería.
        </p>
      ) : (
        <>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelectedPaths(
                  allSelected ? [] : photos.map((photo) => photo.path),
                )
              }
              disabled={uploading || deleting}
              className="h-4 w-4 rounded border-slate-300 text-sky-700"
            />
            Seleccionar todas
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <label
                key={photo.path}
                className={`relative cursor-pointer overflow-hidden rounded-xl bg-white ring-2 ${
                  selectedPaths.includes(photo.path)
                    ? "ring-sky-600"
                    : "ring-transparent"
                }`}
              >
                {/* Storage images use a runtime-configured host, so render them without Next's remote image loader. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Fotografía de la Feria de Seguridad SAESA"
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-md bg-white/95 p-1 shadow">
                  <input
                    type="checkbox"
                    checked={selectedPaths.includes(photo.path)}
                    onChange={() => togglePhoto(photo.path)}
                    disabled={uploading || deleting}
                    aria-label="Seleccionar foto para eliminar"
                    className="h-4 w-4 rounded border-slate-300 text-sky-700"
                  />
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

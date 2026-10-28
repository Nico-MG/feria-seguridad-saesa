"use client";

import { ChangeEvent, MouseEvent, useEffect, useState } from "react";

type Finding = {
  id: string;
  x: number;
  y: number;
  radius: number;
  title: string;
};

type GameImage = {
  id: string;
  image: string;
  imagePath?: string;
  imageWidth: number;
  imageHeight: number;
  findings: Finding[];
  file?: File;
};

type Session = "morning" | "afternoon";

const sessionLabel: Record<Session, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
};

async function compressImage(file: File): Promise<{
  file: File;
  preview: string;
  width: number;
  height: number;
}> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("No fue posible procesar una imagen.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("No fue posible comprimir una imagen.");

  const compressed = new File([blob], "desafio.jpg", {
    type: "image/jpeg",
  });
  const preview = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer una imagen."));
    reader.readAsDataURL(compressed);
  });

  return {
    file: compressed,
    preview,
    width: canvas.width,
    height: canvas.height,
  };
}

export default function AdminGameEditor() {
  const [images, setImages] = useState<GameImage[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConfiguration() {
      try {
        const response = await fetch("/api/admin/game", {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          images?: GameImage[];
          activeSession?: Session | null;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            result.error ?? "No fue posible cargar la configuración.",
          );
        }
        if (active) {
          const loadedImages = result.images ?? [];
          setImages(loadedImages);
          setActiveSession(result.activeSession ?? null);
          setSelectedImageId(loadedImages[0]?.id ?? null);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar la configuración.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadConfiguration();
    return () => {
      active = false;
    };
  }, []);

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setNotice(null);

    try {
      const remaining = 20 - images.length;
      if (files.length > remaining) {
        throw new Error("El juego permite un máximo de 20 imágenes.");
      }

      const added = await Promise.all(
        files.map(async (file): Promise<GameImage> => {
          if (!file.type.startsWith("image/")) {
            throw new Error("Selecciona solo archivos de imagen.");
          }
          const processed = await compressImage(file);
          return {
            id: crypto.randomUUID(),
            image: processed.preview,
            imageWidth: processed.width,
            imageHeight: processed.height,
            findings: [],
            file: processed.file,
          };
        }),
      );

      setImages((current) => [...current, ...added]);
      setSelectedImageId((current) => current ?? added[0]?.id ?? null);
      setNotice(`${added.length} imagen(es) cargada(s). Marca sus hallazgos.`);
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "No fue posible cargar las imágenes.",
      );
    }
  }

  function addFinding(imageId: string, event: MouseEvent<HTMLDivElement>) {
    const image = images.find((item) => item.id === imageId);
    if (!image) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const title = window.prompt(
      "Describe el hallazgo:",
      "Trabajador sin casco",
    );

    if (!title?.trim()) return;
    setImages((current) =>
      current.map((item) =>
        item.id === imageId
          ? {
              ...item,
              findings: [
                ...item.findings,
                {
                  id: crypto.randomUUID(),
                  x,
                  y,
                  radius: 0.045,
                  title: title.trim(),
                },
              ],
            }
          : item,
      ),
    );
  }

  function removeFinding(imageId: string, findingId: string) {
    setImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? {
              ...image,
              findings: image.findings.filter(
                (finding) => finding.id !== findingId,
              ),
            }
          : image,
      ),
    );
  }

  function removeImage(imageId: string) {
    const next = images.filter((image) => image.id !== imageId);
    setImages(next);
    if (selectedImageId === imageId) {
      setSelectedImageId(next[0]?.id ?? null);
    }
  }

  function moveImage(imageId: string, offset: -1 | 1) {
    setImages((current) => {
      const index = current.findIndex((image) => image.id === imageId);
      const targetIndex = index + offset;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  async function saveConfiguration() {
    if (
      images.length < 2 ||
      images.some((image) => image.findings.length === 0)
    ) {
      setError("Agrega al menos dos imágenes y configura hallazgos en todas.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set(
        "images",
        JSON.stringify(
          images.map((image) => ({
            id: image.id,
            imagePath: image.imagePath,
            imageWidth: image.imageWidth,
            imageHeight: image.imageHeight,
            findings: image.findings,
          })),
        ),
      );
      for (const image of images) {
        if (image.file) formData.set(`image-${image.id}`, image.file);
      }

      const response = await fetch("/api/admin/game", {
        method: "PUT",
        body: formData,
      });
      const result = (await response.json()) as {
        images?: GameImage[];
        error?: string;
      };
      if (!response.ok || !result.images) {
        throw new Error(result.error ?? "No fue posible guardar las imágenes.");
      }

      setImages(result.images);
      setSelectedImageId(result.images[0]?.id ?? null);
      setNotice(
        "Configuración guardada. Las imágenes quedan divididas por orden.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar la configuración.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function setSession(session: Session | null) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/game", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });
      const result = (await response.json()) as {
        activeSession?: Session | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "No fue posible cambiar la sesión.");
      }

      setActiveSession(result.activeSession ?? null);
      setNotice(
        session
          ? `Sesión de ${sessionLabel[session].toLowerCase()} habilitada para nuevos intentos.`
          : "El juego quedó cerrado y se finalizaron los intentos pendientes.",
      );
    } catch (sessionError) {
      setError(
        sessionError instanceof Error
          ? sessionError.message
          : "No fue posible cambiar la sesión.",
      );
    }
  }

  const splitIndex = Math.ceil(images.length / 2);
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? null;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Sesiones del juego
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Carga una serie de imágenes y ordénalas. La primera mitad se asigna
            a la mañana y la segunda a la tarde; si el total es impar, la mañana
            recibe una imagen extra. En cada sesión, cada participante juega
            todas las imágenes asignadas en un único intento.
          </p>
        </div>
        <label
          className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-white ${
            activeSession
              ? "cursor-not-allowed bg-slate-400"
              : "bg-sky-700 transition hover:bg-sky-800"
          }`}
        >
          Agregar imágenes
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={Boolean(activeSession) || saving}
            className="sr-only"
            onChange={(event) => void addImages(event)}
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800"
        >
          {notice}
        </p>
      )}

      <section className="mt-6 rounded-2xl bg-slate-950 p-5 text-white">
        <p className="text-sm font-semibold text-sky-300">
          CONTROL DE SESIONES
        </p>
        <p className="mt-2">
          Estado:{" "}
          <strong>
            {activeSession
              ? `Abierta · ${sessionLabel[activeSession]}`
              : "Cerrado"}
          </strong>
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Solo se puede habilitar una sesión a la vez. Al cerrar, se finalizan
          los intentos pendientes y se registra su puntaje parcial.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => void setSession("morning")}
            disabled={Boolean(activeSession) || saving}
            className="rounded-xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Habilitar mañana
          </button>
          <button
            onClick={() => void setSession("afternoon")}
            disabled={Boolean(activeSession) || saving}
            className="rounded-xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Habilitar tarde
          </button>
          <button
            onClick={() => void setSession(null)}
            disabled={!activeSession}
            className="rounded-xl border border-white/30 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar juego
          </button>
        </div>
      </section>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Cargando imágenes...</p>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <h3 className="font-bold text-slate-800">
                Imágenes ({images.length}/20)
              </h3>
              {images.map((image, index) => {
                const assignedSession: Session =
                  index < splitIndex ? "morning" : "afternoon";
                return (
                  <div
                    key={image.id}
                    className={`rounded-xl border p-3 ${
                      image.id === selectedImageId
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedImageId(image.id)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <img
                        src={image.image}
                        alt=""
                        className="h-14 w-20 rounded-lg object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-800">
                          Imagen {index + 1}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {sessionLabel[assignedSession]} ·{" "}
                          {image.findings.length} hallazgos
                        </span>
                      </span>
                    </button>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => moveImage(image.id, -1)}
                        disabled={Boolean(activeSession) || index === 0}
                        aria-label={`Mover imagen ${index + 1} antes`}
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveImage(image.id, 1)}
                        disabled={
                          Boolean(activeSession) || index === images.length - 1
                        }
                        aria-label={`Mover imagen ${index + 1} después`}
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeImage(image.id)}
                        disabled={Boolean(activeSession)}
                        className="ml-auto rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-40"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
              {images.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Aún no hay imágenes cargadas.
                </p>
              )}
            </aside>

            <div className="min-w-0">
              {selectedImage ? (
                <>
                  <p className="mb-3 text-sm text-slate-600">
                    Imagen{" "}
                    {images.findIndex(
                      (image) => image.id === selectedImage.id,
                    ) + 1}
                    {" · "}
                    {
                      sessionLabel[
                        images.findIndex(
                          (image) => image.id === selectedImage.id,
                        ) < splitIndex
                          ? "morning"
                          : "afternoon"
                      ]
                    }
                    . Haz clic en cada riesgo para registrar su ubicación.
                  </p>
                  <div
                    onClick={(event) =>
                      !activeSession && addFinding(selectedImage.id, event)
                    }
                    className={`relative mx-auto w-full overflow-hidden rounded-xl bg-slate-100 ${
                      activeSession ? "cursor-not-allowed" : "cursor-crosshair"
                    }`}
                  >
                    <img
                      src={selectedImage.image}
                      alt={`Imagen ${images.findIndex((image) => image.id === selectedImage.id) + 1} del desafío`}
                      className="block h-auto w-full"
                      draggable={false}
                      onLoad={(event) => {
                        const { naturalWidth, naturalHeight } =
                          event.currentTarget;
                        setImages((current) =>
                          current.map((image) =>
                            image.id === selectedImage.id
                              ? {
                                  ...image,
                                  imageWidth: naturalWidth,
                                  imageHeight: naturalHeight,
                                }
                              : image,
                          ),
                        );
                      }}
                    />
                    {selectedImage.findings.map((finding, index) => (
                      <div
                        key={finding.id}
                        className="pointer-events-none absolute flex aspect-square items-center justify-center rounded-full border-2 border-red-500 bg-red-500/20"
                        style={{
                          left: `${finding.x * 100}%`,
                          top: `${finding.y * 100}%`,
                          width: `${finding.radius * 200}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span className="rounded-full bg-red-600 px-2 py-1 text-sm font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold text-slate-800">
                      Hallazgos ({selectedImage.findings.length})
                    </h4>
                    {selectedImage.findings.map((finding, index) => (
                      <div
                        key={finding.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                      >
                        <span className="text-sm">
                          {index + 1}. {finding.title}
                        </span>
                        <button
                          onClick={() =>
                            removeFinding(selectedImage.id, finding.id)
                          }
                          disabled={Boolean(activeSession)}
                          className="text-sm font-semibold text-red-700 disabled:opacity-40"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
                  Agrega imágenes y selecciona una para marcar sus hallazgos.
                </p>
              )}
            </div>
          </div>

          {images.length > 0 && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <h3 className="font-bold text-slate-800">
                Distribución prevista
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Mañana: {Math.min(images.length, splitIndex)} imagen(es) ·
                Tarde: {Math.max(0, images.length - splitIndex)} imagen(es)
              </p>
              {images.length % 2 !== 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Al haber un número impar, la mañana recibe la imagen
                  adicional.
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => void saveConfiguration()}
            disabled={
              saving ||
              Boolean(activeSession) ||
              images.length < 2 ||
              images.some((image) => image.findings.length === 0)
            }
            className="mt-6 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar configuración de imágenes"}
          </button>
          {activeSession && (
            <p className="mt-2 text-sm text-amber-800">
              Cierra la sesión activa antes de modificar las imágenes.
            </p>
          )}
        </>
      )}
    </section>
  );
}

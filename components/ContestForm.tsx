"use client";

type ContestFormProps = {
  completed: boolean;
};

export default function ContestForm({
  completed,
}: ContestFormProps) {
  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    alert(
      "¡Tu participación en el concurso ha sido registrada!"
    );
  }

  if (!completed) {
    return (
      <div className="rounded-2xl bg-slate-100 p-6 text-center">
        <div className="text-3xl">🔒</div>

        <h3 className="mt-3 font-bold text-slate-900">
          Concurso bloqueado
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Completa todas las visitas requeridas
          para habilitar tu participación.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-center">
        <div className="text-4xl">
          🎉
        </div>

        <h3 className="mt-3 text-xl font-bold text-slate-900">
          ¡Completaste tu pasaporte!
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Ya cumples los requisitos para participar
          en el concurso.
        </p>
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800"
      >
        🎁 Participar en el concurso
      </button>
    </form>
  );
}
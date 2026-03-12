export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 p-6 text-center shadow-xl ring-1 ring-slate-800">
        <h1 className="text-lg font-semibold text-slate-50">
          Åtkomst nekad
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Du är inte registrerad som intern användare i Kollahär! Command Center.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Om du anser att detta är fel, kontakta systemadministratören.
        </p>
      </div>
    </div>
  );
}


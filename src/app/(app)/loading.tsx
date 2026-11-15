export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="space-y-2">
        <div className="h-2.5 w-24 rounded bg-rule" />
        <div className="h-8 w-72 rounded bg-rule" />
        <div className="h-3 w-96 max-w-full rounded bg-rule/70" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="paper-sheet h-24" />
        ))}
      </div>
      <div className="paper-sheet h-72" />
    </div>
  );
}

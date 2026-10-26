export function ItemDetailsSkeleton() {
  return <div role="status" aria-label="Carregando detalhes do item" className="mx-auto max-w-5xl animate-pulse space-y-5">
    <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
    <div className="grid gap-6 md:grid-cols-2">
      <div className="aspect-square rounded-3xl bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-5 rounded-3xl bg-white p-6">
        <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
    <span className="sr-only">Carregando...</span>
  </div>;
}
export function ListSkeleton({ count = 4 }) {
  return <div role="status" aria-label="Carregando informações" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }, (_, i) => <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="h-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
    </div>)}
    <span className="sr-only">Carregando...</span>
  </div>;
}

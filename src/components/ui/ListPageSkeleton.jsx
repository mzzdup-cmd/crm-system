export default function ListPageSkeleton({
  rows = 4,
}) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-800 rounded-xl w-1/3" />

      {Array.from({ length: rows }).map(
        (_, index) => (
          <div
            key={index}
            className="h-36 bg-slate-900 rounded-2xl"
          />
        )
      )}
    </div>
  );
}

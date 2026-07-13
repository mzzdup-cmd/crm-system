export default function ListPageSkeleton({
  rows = 4,
}) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-surface-raised rounded-xl w-1/3" />

      {Array.from({ length: rows }).map(
        (_, index) => (
          <div
            key={index}
            className="h-36 bg-surface rounded-2xl"
          />
        )
      )}
    </div>
  );
}

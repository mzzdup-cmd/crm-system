export default function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-2">

      <div className="h-10 bg-surface-raised rounded-xl w-1/3" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {

          Array.from({ length: 4 }).map(
            (_, index) => (

              <div
                key={index}
                className="h-28 bg-surface rounded-2xl"
              />

            )
          )

        }

      </div>

      <div className="h-72 bg-surface rounded-2xl" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        <div className="h-64 bg-surface rounded-2xl" />

        <div className="h-64 bg-surface rounded-2xl" />

      </div>

    </div>
  );
}

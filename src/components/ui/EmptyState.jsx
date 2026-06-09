export default function EmptyState({
  icon = "📭",
  title = "Нет данных",
  description = "",
  action = null,
}) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        text-center py-12 px-6
        bg-slate-900/50 rounded-2xl
        border border-slate-800/80
      "
    >
      <div className="text-4xl mb-4 opacity-80">

        {icon}

      </div>

      <div className="text-xl font-bold mb-2">

        {title}

      </div>

      {

        description && (

          <p className="text-slate-400 max-w-md mb-6">

            {description}

          </p>

        )

      }

      {action}

    </div>
  );
}

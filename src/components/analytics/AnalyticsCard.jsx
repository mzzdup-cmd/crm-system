export default function AnalyticsCard({
  title,
  hint,
  value,
  subtitle,
  accent = "text-green-400",
  children,
}) {
  return (
    <div className="bg-surface p-6 rounded-2xl border border-neutral-800">

      <div className="font-semibold text-neutral-200">

        {title}

      </div>

      {hint && (
        <div className="text-neutral-500 text-xs font-normal mt-0.5">
          {hint}
        </div>
      )}

      {

        value !== undefined && (

          <div
            className={`text-3xl font-bold mt-2 ${accent}`}
          >

            {value}

          </div>

        )

      }

      {

        subtitle && (

          <div className="text-neutral-500 mt-2 text-sm">

            {subtitle}

          </div>

        )

      }

      {children}

    </div>
  );
}

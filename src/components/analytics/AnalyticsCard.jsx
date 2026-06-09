export default function AnalyticsCard({
  title,
  value,
  subtitle,
  accent = "text-green-400",
  children,
}) {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">

      <div className="text-slate-400">

        {title}

      </div>

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

          <div className="text-slate-500 mt-2 text-sm">

            {subtitle}

          </div>

        )

      }

      {children}

    </div>
  );
}

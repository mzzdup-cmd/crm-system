export default function PageHeader({
  title,
  subtitle = "",
  badge = null,
  actions = null,
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6 md:mb-8">

      <div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">

          {title}

        </h1>

        {

          (subtitle || badge) && (

            <div className="text-neutral-400 mt-2 flex flex-wrap items-center gap-3 text-sm md:text-base">

              {subtitle}

              {badge}

            </div>

          )

        }

      </div>

      {

        actions && (

          <div className="flex flex-wrap items-center gap-2">

            {actions}

          </div>

        )

      }

    </div>

  );
}

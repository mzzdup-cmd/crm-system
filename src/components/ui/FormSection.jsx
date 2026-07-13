export default function FormSection({
  title,
  children,
}) {
  return (
    <section
      className="
        space-y-3 pt-5
        border-t border-neutral-800
        first:border-t-0 first:pt-0
      "
    >
      <h3
        className="
          text-xs font-semibold uppercase
          tracking-wider text-brand/90
        "
      >
        {title}
      </h3>

      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

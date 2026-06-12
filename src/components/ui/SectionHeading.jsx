export default function SectionHeading({
  title,
  hint,
  size = "md",
  className = "",
}) {
  const titleClass =
    size === "lg"
      ? "text-2xl font-bold"
      : "text-xl font-bold";

  return (
    <div className={`${className}`}>
      <h2 className={titleClass}>
        {title}
      </h2>

      {hint && (
        <p className="text-slate-500 text-sm font-normal mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}

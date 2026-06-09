export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : variant === "default"
        ? "bg-cyan-600 hover:bg-cyan-700"
        : "bg-cyan-600 hover:bg-cyan-700";

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/60 p-4
      "
      role="dialog"
      aria-modal="true"
    >
      <div
        className="
          bg-slate-900 border border-slate-700
          rounded-2xl p-6 max-w-md w-full
          shadow-xl
        "
      >
        <h2 className="text-xl font-bold mb-2">
          {title}
        </h2>

        <p className="text-slate-400 mb-6">
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="
              px-4 py-2 rounded-xl
              bg-slate-800 hover:bg-slate-700
              disabled:opacity-50
            "
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`
              px-4 py-2 rounded-xl font-semibold
              text-white disabled:opacity-50
              ${confirmClass}
            `}
          >
            {loading
              ? "Обработка..."
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

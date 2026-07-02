export default function CuratorStartDateField({
  value,
  onChange,
  disabled = false,
  inputClass = "w-full bg-slate-800 p-3.5 rounded-xl",
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">
        Фактический старт (для куратора)
      </span>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={`${inputClass} mt-1 disabled:opacity-60`}
      />
      <p className="text-slate-500 text-xs mt-1.5">
        Не попадает в ТТ. В выбранный день —
        напоминание отправить материалы куратору.
      </p>
    </label>
  );
}

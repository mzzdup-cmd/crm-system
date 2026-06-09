export default function RealtimeIndicator({
  connected = false,
  className = "",
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        text-xs font-medium
        ${className}
      `}
      title={
        connected
          ? "Realtime подключён"
          : "Подключение..."
      }
    >
      <span
        className={`
          w-2 h-2 rounded-full
          ${
            connected
              ? "bg-emerald-400 animate-pulse"
              : "bg-slate-500"
          }
        `}
      />

      <span className="text-slate-400 hidden sm:inline">

        {connected ? "Live" : "..."}

      </span>
    </span>
  );
}

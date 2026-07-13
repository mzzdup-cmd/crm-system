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
              ? "bg-brand animate-pulse"
              : "bg-neutral-500"
          }
        `}
      />

      <span className="text-neutral-400 hidden sm:inline">

        {connected ? "Live" : "..."}

      </span>
    </span>
  );
}

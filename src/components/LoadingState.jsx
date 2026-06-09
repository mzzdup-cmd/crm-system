export default function LoadingState({
  message = "Загрузка...",
}) {
  return (
    <div className="text-white p-10">
      {message}
    </div>
  );
}

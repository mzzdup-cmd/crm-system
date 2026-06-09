import { Link }
from "react-router-dom";

export default function UnauthorizedPage() {

  return (

    <div className="min-h-[60vh] flex items-center justify-center">

      <div className="bg-slate-900 p-10 rounded-2xl max-w-lg text-center">

        <div className="text-5xl mb-6">

          🔒

        </div>

        <h1 className="text-3xl font-bold mb-4">

          Доступ ограничен

        </h1>

        <p className="text-slate-400 mb-8">

          У вас нет прав для просмотра этой страницы.
          Обратитесь к руководителю, если считаете это ошибкой.

        </p>

        <Link
          to="/"
          className="inline-block bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-bold"
        >

          На Dashboard

        </Link>

      </div>

    </div>

  );

}

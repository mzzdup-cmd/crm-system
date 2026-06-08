import {
  getAuth,
  signOut,
} from "firebase/auth";
import { Link } from "react-router-dom";
import { useAuth }
from "../context/AuthContext";

export default function DashboardLayout({ children }) {
  const { userData } = useAuth();
  async function handleLogout() {

  const auth = getAuth();

  await signOut(auth);

}
  return (

  <div className="flex">

    <aside className="w-64 bg-slate-950 p-8 min-h-screen">

      <h1 className="text-5xl font-bold mb-12">

        CRM School

      </h1>

      <nav>

        <div className="flex flex-col gap-6 mt-12">

          <Link to="/">
            Dashboard
          </Link>

          <Link to="/clients">
            Клиенты
          </Link>

          <Link to="/deals">
            Сделки
          </Link>

          <Link to="/new-payment">
            Новая оплата
          </Link>

          <Link to="/subscriptions">
            Подписки
          </Link>

          <Link to="/payments">
            Платежи
          </Link>

          <Link to="/salary">
            Зарплата
          </Link>
          

          <Link to="/rating">
            Рейтинг
          </Link>

          <Link to="/night-shifts">
  Ночные смены
</Link>

<Link to="/bonuses">
  Бонусы
</Link>

        </div>

        <button
          onClick={handleLogout}
          className="mt-10 text-red-400"
        >

          Выйти

        </button>

      </nav>

    </aside>

    <main className="flex-1 p-8">

      {children}

    </main>

  </div>

);
}
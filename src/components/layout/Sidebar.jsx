import {
  NavLink,
} from "react-router-dom";

function navClassName({ isActive }) {
  return `
    block px-4 py-3 rounded-xl transition-all duration-200
    ${
      isActive
        ? "bg-cyan-500/20 text-cyan-300 font-bold"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }
  `;
}

export default function Sidebar({
  navItems,
  displayName,
  isAdmin,
  onLogout,
  onNavigate,
  className = "",
  notificationBell = null,
}) {
  return (
    <aside
      className={`
        bg-slate-950 border-r border-slate-800
        flex flex-col h-full
        ${className}
      `}
    >

      <div className="p-6 border-b border-slate-800">

        <div className="flex items-start justify-between gap-3">

          <div>

            <h1 className="text-2xl lg:text-3xl font-bold">

              CRM School

            </h1>

            {

              displayName && (

                <div className="text-slate-400 mt-3 text-sm">

                  {displayName}

                  {

                    isAdmin && (

                      <span className="ml-2 text-cyan-400">

                        Admin

                      </span>

                    )

                  }

                </div>

              )

            }

          </div>

          {

            notificationBell

          }

        </div>

      </div>

      <nav className="flex-1 overflow-y-auto p-4">

        <div className="flex flex-col gap-2">

          {

            navItems.map((item) => (

              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={navClassName}
                onClick={onNavigate}
              >

                {item.label}

              </NavLink>

            ))

          }

        </div>

      </nav>

      <div className="p-4 border-t border-slate-800">

        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >

          Выйти

        </button>

      </div>

    </aside>
  );
}

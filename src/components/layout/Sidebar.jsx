import {
  NavLink,
} from "react-router-dom";

function navClassName({ isActive }) {
  return `
    block px-4 py-3 rounded-xl transition-all duration-200
    ${
      isActive
        ? "bg-brand/15 text-brand font-bold"
        : "text-neutral-300 hover:bg-surface-hover hover:text-white"
    }
  `;
}

export default function Sidebar({
  navItems,
  displayName,
  roleLabel = "",
  onLogout,
  onNavigate,
  className = "",
  notificationBell = null,
}) {
  return (
    <aside
      className={`
        bg-surface-deep border-r border-neutral-800
        flex flex-col h-full
        ${className}
      `}
    >

      <div className="p-6 border-b border-neutral-800 overflow-visible relative z-20">

        <div className="flex items-start justify-between gap-3">

          <div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              CRM{" "}
              <span className="text-brand">School</span>
            </h1>

            {

              displayName && (

                <div className="text-neutral-400 mt-3 text-sm">

                  {displayName}

                  {roleLabel && (
                    <span className="ml-2 text-brand">
                      {roleLabel}
                    </span>
                  )}

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

      <div className="p-4 border-t border-neutral-800">

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

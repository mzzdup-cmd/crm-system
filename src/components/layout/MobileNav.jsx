import {
  NavLink,
} from "react-router-dom";

import {
  MOBILE_BOTTOM_NAV,
} from "../../config/navigation";

function mobileNavClass({ isActive }) {
  return `
    flex flex-col items-center justify-center
    flex-1 py-2 px-1 text-xs transition-colors
    ${
      isActive
        ? "text-brand"
        : "text-neutral-400"
    }
  `;
}

export default function MobileNav({
  onMenuOpen,
}) {
  return (
    <nav
      className="
        lg:hidden fixed bottom-0 inset-x-0 z-40
        bg-surface-deep/95 backdrop-blur border-t border-neutral-800
        safe-area-bottom
      "
    >

      <div className="flex items-stretch">

        {

          MOBILE_BOTTOM_NAV.map((item) => (

            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={mobileNavClass}
            >

              <span className="text-lg mb-1">

                {item.icon}

              </span>

              <span className="truncate max-w-[4.5rem]">

                {item.shortLabel}

              </span>

            </NavLink>

          ))

        }

        <button
          type="button"
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center flex-1 py-2 px-1 text-xs text-slate-400"
        >

          <span className="text-lg mb-1">

            ☰

          </span>

          <span>Меню</span>

        </button>

      </div>

    </nav>

  );
}

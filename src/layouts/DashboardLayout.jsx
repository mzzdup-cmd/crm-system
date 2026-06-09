import {
  useState,
  useEffect,
} from "react";

import {
  getAuth,
  signOut,
} from "firebase/auth";

import { useLocation } from "react-router-dom";

import { usePermissions }
from "../hooks/usePermissions";

import {
  getNavItemsForRole,
} from "../config/navigation";

import {
  trackPageView,
} from "../services/monitoringService";

import LoadingState
from "../components/LoadingState";

import Sidebar
from "../components/layout/Sidebar";

import MobileNav
from "../components/layout/MobileNav";

import MobileDrawer
from "../components/layout/MobileDrawer";

import NotificationBell
from "../components/notifications/NotificationBell";

export default function DashboardLayout({ children }) {

  const location = useLocation();

  const {
    userData,
    loading,
    displayName,
    isAdmin,
  } = usePermissions();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  useEffect(() => {
    trackPageView(
      location.pathname,
      document.title
    );
  }, [location.pathname]);

  async function handleLogout() {

    const auth = getAuth();

    await signOut(auth);

  }

  if (loading) {

    return (
      <LoadingState />
    );

  }

  const navItems =
    getNavItemsForRole(
      userData?.role
    );

  return (

    <div className="min-h-screen bg-slate-950">

      <div className="flex min-h-screen">

        {

          /* Desktop sidebar */

        }

        <div className="hidden lg:block w-64 shrink-0">

          <Sidebar
            navItems={navItems}
            displayName={displayName}
            isAdmin={isAdmin}
            onLogout={handleLogout}
            className="fixed inset-y-0 left-0 w-64"
            notificationBell={<NotificationBell />}
          />

        </div>

        {

          /* Tablet collapsible sidebar */

        }

        {

          sidebarOpen && (

            <>

              <button
                type="button"
                aria-label="Close sidebar"
                className="hidden md:block lg:hidden fixed inset-0 z-40 bg-black/60"
                onClick={() =>
                  setSidebarOpen(false)
                }
              />

              <div className="hidden md:block lg:hidden fixed inset-y-0 left-0 z-50 w-64">

                <Sidebar
                  navItems={navItems}
                  displayName={displayName}
                  isAdmin={isAdmin}
                  onLogout={handleLogout}
                  onNavigate={() =>
                    setSidebarOpen(false)
                  }
                  className="w-full h-full"
                  notificationBell={<NotificationBell />}
                />

              </div>

            </>

          )

        }

        <div className="flex-1 flex flex-col min-w-0">

          <header
            className="
              sticky top-0 z-30
              bg-slate-950/90 backdrop-blur
              border-b border-slate-800
              px-4 py-3 md:px-6
              flex items-center justify-between
              lg:hidden
            "
          >

            <div>

              <div className="font-bold text-lg">

                CRM School

              </div>

              {

                displayName && (

                  <div className="text-slate-400 text-xs">

                    {displayName}

                  </div>

                )

              }

            </div>

            <div className="flex items-center gap-2">

              <NotificationBell />

              <button
              type="button"
              className="
                hidden md:inline-flex lg:hidden
                px-4 py-2 rounded-xl bg-slate-800
              "
              onClick={() =>
                setSidebarOpen(true)
              }
            >

              Меню

            </button>

            </div>

          </header>

          <main
            className="
              flex-1 p-4 md:p-6 lg:p-8
              pb-24 lg:pb-8
              max-w-[1600px] w-full mx-auto
            "
          >

            {children}

          </main>

        </div>

      </div>

      <MobileNav
        onMenuOpen={() =>
          setDrawerOpen(true)
        }
      />

      <MobileDrawer
        open={drawerOpen}
        onClose={() =>
          setDrawerOpen(false)
        }
        navItems={navItems}
        displayName={displayName}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

    </div>

  );

}

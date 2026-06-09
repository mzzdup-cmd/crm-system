import Sidebar
from "./Sidebar";

export default function MobileDrawer({
  open,
  onClose,
  navItems,
  displayName,
  isAdmin,
  onLogout,
}) {
  if (!open) {
    return null;
  }

  return (
    <>

      <button
        type="button"
        aria-label="Close menu"
        className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="
          lg:hidden fixed inset-y-0 right-0 z-50
          w-[min(100vw-3rem,20rem)]
          shadow-2xl animate-slide-in-right
        "
      >

        <Sidebar
          navItems={navItems}
          displayName={displayName}
          isAdmin={isAdmin}
          onLogout={onLogout}
          onNavigate={onClose}
          className="w-full"
        />

      </div>

    </>

  );

}

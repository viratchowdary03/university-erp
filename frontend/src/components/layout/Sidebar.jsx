import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import Logo from "../common/Logo";
import { NAV_ITEMS } from "../../config/navigation";
import { can } from "../../config/permissions";

export default function Sidebar({ open, onClose }) {
  const role = useSelector((s) => s.auth.user?.role);
  const items = NAV_ITEMS.filter((item) => can(role, item.permission));
  // keep the menu in the order of NAV_ITEMS, but under one heading per group
  const groups = [...items.reduce((map, item) => map.set(item.group, [...(map.get(item.group) || []), item]), new Map())];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-900 text-brand-100 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo light size={32} />
          <button onClick={onClose} aria-label="Close menu" className="lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {groups.map(([group, groupItems]) => (
            <div key={group} className="pb-2">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-brand-300">{group}</p>
              {groupItems.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/" || path === "/attendance"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      isActive ? "bg-brand-700 font-medium text-white shadow-inner" : "hover:bg-brand-800"
                    }`
                  }
                >
                  <Icon size={18} /> {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

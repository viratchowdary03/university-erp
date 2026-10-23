import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, LogOut, KeyRound, MessageSquare } from "lucide-react";
import NotificationBell from "../../features/notifications/components/NotificationBell";
import { can, PERM } from "../../config/permissions";
import { useData } from "../../api/resource";
import { logout } from "../../features/auth/authSlice";
import { ROLE_LABELS } from "../../config/roles";

export default function Navbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((s) => s.auth.user);
  const chat = useData(["messages", "unread"], "/messages/unread-count", { enabled: can(user?.role, PERM.MESSAGES), refetchInterval: 60_000 });

  const handleLogout = () => {
    dispatch(logout());
    queryClient.clear(); // nothing from this person may show for the next one
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <button onClick={onMenuClick} aria-label="Open menu" className="lg:hidden">
        <Menu size={22} />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <div className="mr-2 text-right">
          <p className="text-sm font-medium capitalize">{user?.name}</p>
          <p className="text-xs text-slate-500">{ROLE_LABELS[user?.role]}</p>
        </div>
        {can(user?.role, PERM.MESSAGES) && !chat.isError && (
          <Link to="/messages" title="Messages" aria-label={`Messages${chat.data?.unread ? `, ${chat.data.unread} unread` : ""}`} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600">
            <MessageSquare size={18} />
            {chat.data?.unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">{chat.data.unread > 9 ? "9+" : chat.data.unread}</span>}
          </Link>
        )}
        <NotificationBell />
        <Link
          to="/change-password"
          title="Change password"
          aria-label="Change password"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
        >
          <KeyRound size={18} />
        </Link>
        <button
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

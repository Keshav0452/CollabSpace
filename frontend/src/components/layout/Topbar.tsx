import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../../features/notifications/NotificationBell";

import "./Layout.css";

function Topbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState("");

  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "Account";

  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Press Ctrl/Cmd + K to jump to the search box.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();

    const term = searchText.trim();

    navigate(term ? `/tasks?search=${encodeURIComponent(term)}` : "/tasks");
  }

  return (
    <header className="topbar">
      <form className="topbar-search" onSubmit={handleSearch} role="search">
        <Search size={18} />
        <input
          ref={searchRef}
          type="text"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
        />
        <kbd>Ctrl K</kbd>
      </form>

      <div className="topbar-actions">
        <NotificationBell />

        <div
          className="topbar-profile"
          title={user?.email ?? displayName}
        >
          <div className="user-avatar">{avatarInitial}</div>
          <span>{displayName}</span>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}

export default Topbar;

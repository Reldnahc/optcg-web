import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useState } from "react";
import { SearchBar } from "../search/SearchBar";
import { BrandWordmark } from "./BrandWordmark";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const headerQuery = location.pathname === "/search" ? (searchParams.get("q") || "") : "";

  return (
    <header className="bg-bg-secondary border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link
          to="/"
          className="group inline-flex h-full items-center [font-family:var(--font-display)] font-bold shrink-0 hover:no-underline tracking-tight"
        >
          <span className="hidden md:flex h-full items-center text-xl leading-none">
            <BrandWordmark />
          </span>
          <img src="/favicon.svg" alt="" aria-hidden="true" className="md:hidden w-8 h-8" />
        </Link>

        <div className="flex-1 max-w-lg">
          <SearchBar compact initialQuery={headerQuery} />
        </div>

        <nav className="hidden md:flex items-center gap-1.5 text-sm ml-auto">
          <NavLink to="/advanced">Advanced</NavLink>
          <NavLink to="/search/syntax">Syntax</NavLink>
          <NavLink to="/sets">Sets</NavLink>
          <NavLink to="/don">DON!!</NavLink>
          <button
            onClick={() => navigate("/random-redirect")}
            className="inline-flex h-9 items-center rounded-md px-3 font-semibold text-text-secondary transition-colors hover:bg-bg-tertiary/70 hover:text-text-primary cursor-pointer"
          >
            Random
          </button>
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary/70 hover:text-text-primary"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect y="4" width="24" height="2.5" rx="1" />
            <rect y="11" width="24" height="2.5" rx="1" />
            <rect y="18" width="24" height="2.5" rx="1" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-border px-4 py-3 flex flex-col text-sm">
          <MobileLink to="/advanced" onClick={() => setMenuOpen(false)}>Advanced Search</MobileLink>
          <MobileLink to="/search/syntax" onClick={() => setMenuOpen(false)}>Syntax Guide</MobileLink>
          <MobileLink to="/sets" onClick={() => setMenuOpen(false)}>All Sets</MobileLink>
          <MobileLink to="/don" onClick={() => setMenuOpen(false)}>DON!! Cards</MobileLink>
        </nav>
      )}
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-9 items-center rounded-md px-3 font-semibold text-text-secondary transition-colors hover:bg-bg-tertiary/70 hover:text-text-primary hover:no-underline"
    >
      {children}
    </Link>
  );
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="rounded-md px-3 py-2 text-text-secondary transition-colors hover:bg-bg-tertiary/70 hover:text-text-primary hover:no-underline"
    >
      {children}
    </Link>
  );
}

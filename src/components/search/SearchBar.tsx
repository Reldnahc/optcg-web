import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce";
import { useAutocomplete } from "../../api/hooks";

interface Props {
  compact?: boolean;
  initialQuery?: string;
  autoFocus?: boolean;
}

export function SearchBar({ compact, initialQuery = "", autoFocus }: Props) {
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounced = useDebounce(value, 150);
  const { data } = useAutocomplete(debounced);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = data?.data ?? [];

  const close = useCallback(() => {
    setOpen(false);
    setHighlightIdx(-1);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  // Sync initialQuery when URL changes
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const submit = (q?: string) => {
    const query = (q ?? value).trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      close();
      inputRef.current?.blur();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "Enter") {
      if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
        submit(suggestions[highlightIdx]);
      } else {
        submit();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, -1));
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <svg
        className={`absolute top-1/2 -translate-y-1/2 text-text-muted pointer-events-none ${compact ? "left-2.5 w-4 h-4" : "left-3.5 w-5 h-5"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setHighlightIdx(-1);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoFocus={autoFocus}
        placeholder={compact ? "Search cards..." : "Search for One Piece cards by name, effect, color, and more..."}
        className={`w-full text-text-primary rounded-md
          placeholder:text-text-muted focus:outline-none
          ${compact ? "" : "focus:ring-2 focus:ring-accent/40"}
          ${compact
            ? "bg-bg-secondary border-transparent border pl-8 pr-7 py-1.5 text-sm h-10"
            : "bg-bg-input border border-border pl-10 pr-10 py-2.5 text-base focus:border-accent/60"}`}
      />
      <Link
        to="/search/syntax"
        className={`absolute top-1/2 -translate-y-1/2 text-text-muted hover:text-accent text-xs font-bold
          hover:no-underline ${compact ? "right-2" : "right-3 text-sm"}`}
        title="Search syntax help"
        tabIndex={-1}
      >
        ?
      </Link>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-md shadow-2xl z-50 overflow-hidden">
          {suggestions.map((name, i) => (
            <li key={name}>
              <button
                className={`w-full text-left px-3 py-1.5 text-sm
                  ${i === highlightIdx ? "bg-accent/20 text-text-primary" : "text-text-primary hover:bg-bg-hover"}`}
                onMouseDown={() => submit(name)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

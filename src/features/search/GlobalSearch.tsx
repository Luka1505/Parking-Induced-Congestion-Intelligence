import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import type { Zone } from "../../types/domain";
import { useDashboardStore } from "../../store/dashboardStore";
import { searchZones } from "../../utils/analytics";

interface GlobalSearchProps {
  zones: Zone[];
}

function highlight(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-amber-100 px-0.5 text-zinc-950">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function GlobalSearch({ zones }: GlobalSearchProps) {
  const navigate = useNavigate();
  const setSearchQuery = useDashboardStore((state) => state.setSearchQuery);
  const selectZone = useDashboardStore((state) => state.selectZone);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchZones(zones, query), [query, zones]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function selectResult(index: number) {
    const result = results[index];
    if (!result) return;
    selectZone(result.zone);
    setSearchQuery("");
    setQuery("");
    setOpen(false);
    navigate(`/workspace?zone=${result.zone.zoneId}`);
  }

  return (
    <div className="relative w-full max-w-xl" role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSearchQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => Math.min(results.length - 1, index + 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (results.length) selectResult(activeIndex);
          }
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
            setSearchQuery("");
          }
        }}
        aria-label="Search zones by ID, area, road, police station, commercial area, or location"
        aria-expanded={open && results.length > 0}
        aria-controls="global-search-results"
        className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-10 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder="Search zone, road, station, commercial area"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
          onClick={() => {
            setQuery("");
            setSearchQuery("");
            setOpen(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open && query && results.length > 0 ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-12 z-[1000] max-h-80 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-2 shadow-panel"
        >
          {results.map((result, index) => (
            <button
              key={result.zone.zoneId}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`block w-full px-3 py-2 text-left text-sm transition ${
                index === activeIndex ? "bg-blue-50" : "hover:bg-zinc-50"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectResult(index)}
            >
              <div className="font-semibold text-zinc-950">{highlight(result.label, query)}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{highlight(result.matchText, query)}</div>
              <div className="mt-1 text-xs text-zinc-500">{result.subLabel}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Store = { id: string; name: string };

type Props = {
  stores: Store[];
  value: string;
  onChange: (storeId: string) => void;
  placeholder?: string;
  allowAll?: boolean;
  className?: string;
};

export function StoreSearchSelect({
  stores,
  value,
  onChange,
  placeholder = "Mağaza adı yazın…",
  allowAll = true,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = stores.find((s) => s.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return stores.slice(0, 40);
    return stores
      .filter((s) => s.name.toLocaleLowerCase("tr").includes(q))
      .slice(0, 40);
  }, [stores, query]);

  function clearBlurTimer() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{selected.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
            {allowAll ? "Tümü" : "Temizle"}
          </Button>
        </div>
      ) : (
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            clearBlurTimer();
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
        />
      )}
      {open && !selected && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-background py-1 shadow-md">
          {allowAll && (
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick("")}
              >
                Tüm mağazalar
              </button>
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Mağaza bulunamadı</li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s.id)}
                >
                  {s.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShoppingBag, Trash2, ToggleLeft, ToggleRight, Search, Check } from "lucide-react";
import type { Item } from "@shared/schema";

// ✅ Import Excel UI (same as Branches page)
import ImportExcelButton from "./components/ImportExcelButton";

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export default function Items() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ✅ Autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; unit: string }) =>
      apiRequest("POST", "/api/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setName("");
      setUnit("");
      toast({ title: t.common.success });
    },
    onError: () => toast({ title: t.common.error, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/items/${id}/toggle`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/items"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/items/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setDeleteId(null);
      toast({ title: t.common.success });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMutation.mutate({ name: name.trim(), unit: unit.trim() });
  };

  const q = useMemo(() => norm(searchQuery), [searchQuery]);

  const filteredItems = useMemo(() => {
    const list = items || [];
    if (!q) return list;
    return list.filter((it) =>
      `${it.code ?? ""} ${it.name ?? ""} ${it.unit ?? ""}`.toLowerCase().includes(q),
    );
  }, [items, q]);

  const suggestions = useMemo(() => {
    const list = q ? filteredItems : (items || []);
    return list.slice(0, 20);
  }, [items, filteredItems, q]);

  const pickItem = (it: Item) => {
    setSelectedId(it.id);
    // ✅ โชว์ชื่ออย่างเดียว (ยังค้นด้วย code ได้อยู่ เพราะ filter ใช้ code+name)
    setSearchQuery(it.name);
    setShowDropdown(false);
    setHighlightIndex(0);

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-row-id="item-${it.id}"]`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  // ✅ ESC close
  useEffect(() => {
    if (!showDropdown) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showDropdown]);

  // ✅ outside click close
  useEffect(() => {
    if (!showDropdown) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (!wrapRef.current?.contains(target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [showDropdown]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((cur) => Math.min(cur + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((cur) => Math.max(cur - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[highlightIndex] || suggestions[0];
      if (pick) pickItem(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const noResultsText = (t as any)?.common?.noResults || "No results";
  const importItemsLabel =
    (t as any)?.common?.importItems ||
    (t as any)?.items?.importItems ||
    "Import Items (.xlsx)";

  return (
    <div className="space-y-6">
      {/* Add Item Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t.items.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.items.name}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.items.namePlaceholder}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">{t.items.unit}</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={t.items.unitPlaceholder}
                />
              </div>
            </div>

            <Button type="submit" disabled={addMutation.isPending || !name.trim()}>
              {t.items.addItem}
            </Button>
          </form>

          {/* ✅ Import Items */}
          <div className="pt-4 border-t border-border">
            <ImportExcelButton
              endpoint="/api/import/items"
              label={importItemsLabel}
              onDone={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/items"] });
                toast({ title: t.common.success });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Item List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.items.itemList}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ Autocomplete search */}
          <div ref={wrapRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={(t as any)?.items?.searchPlaceholder || "Search by name or code..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                setSelectedId(null);
                setHighlightIndex(0);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={onInputKeyDown}
              className="pl-10"
            />

            {showDropdown && (
              <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-md overflow-hidden">
                {suggestions.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">{noResultsText}</div>
                ) : (
                  <div className="max-h-64 overflow-auto">
                    {suggestions.map((it, idx) => {
                      const active = idx === highlightIndex;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onMouseDown={() => pickItem(it)}
                          onMouseEnter={() => setHighlightIndex(idx)}
                          className={[
                            "w-full text-left px-3 py-2 flex items-center justify-between gap-3",
                            active ? "bg-muted" : "hover:bg-muted",
                          ].join(" ")}
                        >
                          {/* ✅ โชว์แค่ชื่อ */}
                          <span className="truncate">{it.name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            {it.unit ? (
                              <span className="text-xs text-muted-foreground">{it.unit}</span>
                            ) : null}
                            {selectedId === it.id ? <Check className="h-4 w-4 text-primary" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t.items.id}</TableHead>
                    <TableHead>{t.items.name}</TableHead>
                    <TableHead>{t.items.unit}</TableHead>
                    <TableHead>{t.items.status}</TableHead>
                    <TableHead className="text-right">{t.items.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => (
                    <TableRow
                      key={item.id}
                      data-row-id={`item-${item.id}`}
                      className={selectedId === item.id ? "bg-muted/60" : ""}
                    >
                      <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                          {item.isActive ? t.items.active : t.items.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleMutation.mutate(item.id)}
                            disabled={toggleMutation.isPending}
                          >
                            {item.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">{t.items.toggle}</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(item.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">{t.items.delete}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t.history.noRecords}</p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.items.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {t.items.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

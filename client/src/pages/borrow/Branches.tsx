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
import { Building2, Trash2, ToggleLeft, ToggleRight, Search, Check } from "lucide-react";
import ImportExcelButton from "./components/ImportExcelButton";
import { BorrowLayout } from "./borrow-layout";
import type { BorrowBranch } from "@shared/schema"; // ✅ แก้ Type ให้ตรง schema (ถ้าชื่อ Type จริงคือ BorrowBranch)

// Helper function
function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export default function Branches() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);

  // ✅ Autocomplete States
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Fetch Branches (Update endpoint)
  const { data: branches, isLoading } = useQuery<BorrowBranch[]>({
    queryKey: ["/api/borrow/branches"],
  });

  // ✅ Add Branch Mutation (Update endpoint)
  const addMutation = useMutation({
    mutationFn: async (data: { code: string; name: string }) => {
      return apiRequest("POST", "/api/borrow/branches/add", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrow/branches"] });
      setCode("");
      setName("");
      toast({ title: t.common.success });
    },
    onError: () => {
      toast({ title: t.common.error, variant: "destructive" });
    },
  });

  // ✅ Toggle Mutation (Update endpoint - Note: Backend route might need 'toggle' support if not present, otherwise handle accordingly)
  // Assuming backend has toggle route or we use update
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", "/api/borrow/branches/toggle", { id }), // Changed PATCH to POST if needed, check backend
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/borrow/branches"] }),
  });

  // ✅ Delete Mutation (Update endpoint)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", "/api/borrow/branches/delete", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrow/branches"] });
      setDeleteId(null);
      toast({ title: t.common.success });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMutation.mutate({ code: code.trim(), name: name.trim() });
  };

  const q = useMemo(() => norm(searchQuery), [searchQuery]);

  const filteredBranches = useMemo(() => {
    const list = branches || [];
    if (!q) return list;
    return list.filter((b) => `${b.code ?? ""} ${b.name ?? ""}`.toLowerCase().includes(q));
  }, [branches, q]);

  const suggestions = useMemo(() => {
    const list = q ? filteredBranches : (branches || []);
    return list.slice(0, 20);
  }, [branches, filteredBranches, q]);

  const pickBranch = (b: BorrowBranch) => {
    setSelectedId(b.id);
    setSearchQuery(b.code ? `${b.code} - ${b.name}` : b.name);
    setShowDropdown(false);
    setHighlightIndex(0);

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-row-id="branch-${b.id}"]`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  // Events for autocomplete (ESC, Click Outside)
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
      if (pick) pickBranch(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const searchPlaceholder = (t as any)?.branches?.searchPlaceholder || "Search branch...";
  const noResultsText = (t as any)?.common?.noResults || "No results";
  const idLabel = (t as any)?.branches?.id || "ID";
  const codeLabel = (t as any)?.branches?.code || "Code";
  const nameLabel = (t as any)?.branches?.name || "Name";
  const actionLabel = (t as any)?.branches?.actions || "Actions";
  const deleteLabel = (t as any)?.branches?.deleteBranch || "Delete";
  const codePlaceholder = (t as any)?.branches?.codePlaceholder || "Branch Code";
  const namePlaceholder = (t as any)?.branches?.namePlaceholder || "Branch Name";
  const branchListLabel = (t as any)?.branches?.branchList || "Branch List";

  return (
    <BorrowLayout>
      <div className="space-y-6">
      {/* Add Branch Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t.branches?.title || "Branches"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">{codeLabel}</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={codePlaceholder}
                  data-testid="input-branch-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{nameLabel}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                  required
                  data-testid="input-branch-name"
                />
              </div>
            </div>
            <Button type="submit" disabled={addMutation.isPending || !name.trim()}>
              {t.branches?.addBranch || "Add Branch"}
            </Button>
          </form>

          {/* ✅ Updated Import Button */}
          <div className="pt-4">
            <ImportExcelButton
              endpoint="/api/borrow/branches/import" // Corrected Endpoint
              label="⬆ Import Branches (.xlsx/.csv)"
              accept=".csv,.xlsx,.xls"               // Added CSV support
              onDone={(result) => {
                queryClient.invalidateQueries({ queryKey: ["/api/borrow/branches"] });
                if (result?.imported) setImportResult(result);
                toast({ title: t.common.success, description: `Imported ${result.imported} branches` });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Branch List Table */}
      <Card>
        <CardHeader>
          <CardTitle>{branchListLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Autocomplete Input */}
          <div ref={wrapRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
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
                    {suggestions.map((b, idx) => {
                      const active = idx === highlightIndex;
                      const label = b.code ? `${b.code} - ${b.name}` : b.name;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onMouseDown={() => pickBranch(b)}
                          onMouseEnter={() => setHighlightIndex(idx)}
                          className={[
                            "w-full text-left px-3 py-2 flex items-center justify-between gap-3",
                            active ? "bg-muted" : "hover:bg-muted",
                          ].join(" ")}
                        >
                          <span className="truncate">{label}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            {selectedId === b.id ? <Check className="h-4 w-4 text-primary" /> : null}
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
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : branches && branches.length > 0 ? (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 md:w-20">{idLabel}</TableHead>
                    <TableHead className="hidden md:table-cell">{codeLabel}</TableHead>
                    <TableHead>{nameLabel}</TableHead>
                    <TableHead className="text-right">{actionLabel}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((b, index) => (
                    <TableRow
                      key={b.id}
                      data-row-id={`branch-${b.id}`}
                      className={selectedId === b.id ? "bg-muted/60" : ""}
                    >
                      <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{b.code || "-"}</TableCell>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(b.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">{deleteLabel}</span>
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

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.branches.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Result Dialog */}
      <AlertDialog open={!!importResult} onOpenChange={() => setImportResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Successful</AlertDialogTitle>
            <AlertDialogDescription>
              {importResult?.imported} branches have been imported.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImportResult(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </BorrowLayout>
  );
}

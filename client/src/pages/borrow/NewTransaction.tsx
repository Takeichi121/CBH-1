import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilePlus,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Search,
  Check,
} from "lucide-react";
import type { Branch, Item, CartItem } from "@shared/schema";

const PREDEFINED_UNITS = ["CASE", "PACK", "CASE PACK", "PCS", "BAG", "TRAY", "CAN", "TANK", "ROLL", "BOX", "GAL", "BTL"];

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export default function NewTransaction() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [txType, setTxType] = useState<"borrow_in" | "borrow_out">("borrow_in");
  const [branch, setBranch] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [borrower, setBorrower] = useState("");
  const [lender, setLender] = useState("");
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState(""); // itemId
  const [selectedUnit, setSelectedUnit] = useState("");
  const [qty, setQty] = useState(1);

  // ✅ Autocomplete (items)
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const itemWrapRef = useRef<HTMLDivElement | null>(null);
  const itemInputRef = useRef<HTMLInputElement | null>(null);

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const activeBranches = branches?.filter((b) => b.isActive) || [];
  const activeItems = items?.filter((i) => i.isActive) || [];

  const submitMutation = useMutation({
    mutationFn: async (data: {
      txDate: string;
      dueDate?: string;
      txType: string;
      branch: string;
      borrower: string;
      lender: string;
      note: string;
      items: CartItem[];
    }) => apiRequest("POST", "/api/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({ title: t.common.success });
      navigate("/history");
    },
    onError: () => toast({ title: t.common.error, variant: "destructive" }),
  });

  const addToCart = () => {
    if (!selectedItem || qty < 1) return;

    const item = activeItems.find((i) => i.id === selectedItem);
    if (!item) return;

    const existingIndex = cart.findIndex((c) => c.id === selectedItem);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].qty += qty;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        { id: item.id, name: item.name, qty, unit: selectedUnit || item.units?.[0] || "" },
      ]);
    }

    // reset
    setSelectedItem("");
    setSelectedUnit("");
    setQty(1);
    setItemSearchQuery("");
    setShowItemDropdown(false);
    setHighlightIndex(0);
    itemInputRef.current?.focus();
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(cart.map((c) => (c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c)));
  };

  const removeFromCart = (id: string) => setCart(cart.filter((c) => c.id !== id));
  const clearCart = () => setCart([]);

  const updateCartUnit = (id: string, newUnit: string) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, unit: newUnit } : item
    ));
  };

  const handleSubmit = () => {
    if (!branch || cart.length === 0) return;
    submitMutation.mutate({ txDate, dueDate: dueDate || undefined, txType, branch, borrower, lender, note, items: cart });
  };

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  // ===== autocomplete list =====
  const q = useMemo(() => norm(itemSearchQuery), [itemSearchQuery]);

  const filteredItems = useMemo(() => {
    const list = activeItems;
    if (!q) return list.slice(0, 20);
    return list
      .filter((it) => `${it.code ?? ""} ${it.name ?? ""}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [activeItems, q]);

  const pickItem = (it: Item) => {
    setSelectedItem(it.id);
    setSelectedUnit(it.units?.[0] || "");
    setItemSearchQuery(it.code ? `${it.code} - ${it.name}` : it.name);
    setShowItemDropdown(false);
    setHighlightIndex(0);
  };

  // ✅ ESC close
  useEffect(() => {
    if (!showItemDropdown) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowItemDropdown(false);
        itemInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showItemDropdown]);

  // ✅ outside click close
  useEffect(() => {
    if (!showItemDropdown) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (!itemWrapRef.current?.contains(target)) setShowItemDropdown(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [showItemDropdown]);

  const onItemInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showItemDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((cur) => Math.min(cur + 1, Math.max(filteredItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((cur) => Math.max(cur - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filteredItems[highlightIndex] || filteredItems[0];
      if (pick) pickItem(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowItemDropdown(false);
      itemInputRef.current?.blur();
    }
  };

  const searchPlaceholder = (t as any)?.newTx?.searchPlaceholder || "Search items...";
  const noResultsText = (t as any)?.common?.noResults || "No results";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <FilePlus className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.newTx.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Transaction Type */}
              <div className="space-y-3">
                <Label>{t.newTx.txType}</Label>
                <RadioGroup
                  value={txType}
                  onValueChange={(v) => setTxType(v as "borrow_in" | "borrow_out")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="borrow_in" id="borrow_in" />
                    <Label htmlFor="borrow_in" className="flex items-center gap-2 cursor-pointer font-normal">
                      <ArrowDownLeft className="h-4 w-4 text-chart-2" />
                      {t.newTx.borrowIn}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="borrow_out" id="borrow_out" />
                    <Label htmlFor="borrow_out" className="flex items-center gap-2 cursor-pointer font-normal">
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                      {t.newTx.borrowOut}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Add Item Section */}
              <div className="pt-2 pb-2 border-t border-b border-border">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-48 space-y-2" ref={itemWrapRef}>
                    <Label>{t.newTx.selectItem}</Label>
                    {itemsLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            ref={itemInputRef}
                            placeholder={searchPlaceholder}
                            value={itemSearchQuery}
                            onChange={(e) => {
                              setItemSearchQuery(e.target.value);
                              setShowItemDropdown(true);
                              setSelectedItem("");
                              setHighlightIndex(0);
                            }}
                            onFocus={() => setShowItemDropdown(true)}
                            onKeyDown={onItemInputKeyDown}
                            className="pl-9"
                            data-testid="input-item-search"
                          />
                        </div>
                        {showItemDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredItems.length === 0 ? (
                              <div className="p-3 text-center text-muted-foreground text-sm">
                                {noResultsText}
                              </div>
                            ) : (
                              filteredItems.map((it, idx) => (
                                <div
                                  key={it.id}
                                  onClick={() => pickItem(it)}
                                  className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                                    idx === highlightIndex ? "bg-accent" : "hover:bg-muted"
                                  } ${selectedItem === it.id ? "font-medium" : ""}`}
                                  data-testid={`dropdown-item-${it.id}`}
                                >
                                  {selectedItem === it.id && <Check className="h-4 w-4 text-primary" />}
                                  <span className={selectedItem === it.id ? "" : "ml-6"}>
                                    {it.code ? `${it.code} - ${it.name}` : it.name}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-24 space-y-2">
                    <Label>{t.newTx.qty}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <Button onClick={addToCart} disabled={!selectedItem || qty < 1}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.newTx.add}
                  </Button>
                </div>

                {cart.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button className="w-full" onClick={handleSubmit} disabled={submitMutation.isPending || !branch}>
                      {t.newTx.submitBill}
                    </Button>
                  </div>
                )}
              </div>

              {/* Branch & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.newTx.branch}</Label>
                  {branchesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={branch} onValueChange={setBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.newTx.selectBranch} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeBranches.map((b) => (
                          <SelectItem key={b.id} value={b.name}>
                            {b.code ? `${b.code} - ${b.name}` : b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t.newTx.date}</Label>
                  <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} data-testid="input-tx-date" />
                </div>
                <div className="space-y-2">
                  <Label>{t.newTx.dueDate}</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-due-date" />
                </div>
              </div>

              {/* Borrower & Lender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.newTx.borrower}</Label>
                  <Input value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder={t.newTx.borrowerPlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label>{t.newTx.lender}</Label>
                  <Input value={lender} onChange={(e) => setLender(e.target.value)} placeholder={t.newTx.lenderPlaceholder} />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label>{t.newTx.note}</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t.newTx.notePlaceholder}
                  className="min-h-20"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t.newTx.cart}
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>

            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t.newTx.emptyCart}</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQty(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-mono font-medium">{item.qty}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQty(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="w-[80px]">
                          <Select 
                            value={item.unit || ""} 
                            onValueChange={(value) => updateCartUnit(item.id, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const sourceItem = activeItems.find(i => i.id === item.id);
                                const itemUnits = sourceItem?.units || [];
                                const allUnits = [...new Set([...itemUnits, ...PREDEFINED_UNITS])];
                                return allUnits.map((u) => (
                                  <SelectItem key={u} value={u}>
                                    {u}
                                  </SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground">{t.newTx.total}:</span>
                      <span className="font-bold text-lg">
                        {totalItems} {t.newTx.items}
                      </span>
                    </div>
                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitMutation.isPending || !branch}>
                      {t.newTx.submitBill}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

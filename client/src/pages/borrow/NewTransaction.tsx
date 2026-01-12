  import { useEffect, useMemo, useRef, useState } from "react";
  import { useLanguage } from "@/lib/i18n";
  import { useQuery, useMutation } from "@tanstack/react-query";
  import { queryClient, apiRequest } from "@/lib/queryClient";
  import { useToast } from "@/hooks/use-toast";
  import { useLocation } from "wouter";
  import type { BorrowBranch, BorrowItem } from "@shared/schema";

  // --- UI Components Imports ---
  import { Card, CardContent } from "@/components/ui/card";
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
  import { Search, X, Plus, Minus, Trash2 } from "lucide-react";

  // Type definitions for Cart
  interface CartItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
  }

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

    // Item selection states
    const [selectedItem, setSelectedItem] = useState(""); // itemId stored as String
    const [selectedUnit, setSelectedUnit] = useState("");
    const [qty, setQty] = useState(1);

    // Autocomplete states
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const itemWrapRef = useRef<HTMLDivElement | null>(null);
    const itemInputRef = useRef<HTMLInputElement | null>(null);

    // ✅ Fetch Branches
    const { data: branches, isLoading: branchesLoading } = useQuery<BorrowBranch[]>({
      queryKey: ["/api/borrow/branches"],
      queryFn: async () => {
        const res = await apiRequest("POST", "/api/borrow/branches", { token: localStorage.getItem("bk_token") });
        const data = await res.json();
        return data.branches || [];
      }
    });

    // ✅ Fetch Items
    const { data: items, isLoading: itemsLoading } = useQuery<BorrowItem[]>({
      queryKey: ["/api/borrow/items"],
      queryFn: async () => {
        const res = await apiRequest("POST", "/api/borrow/items", { token: localStorage.getItem("bk_token") });
        const data = await res.json();
        return data.items || [];
      }
    });

    const activeBranches = branches?.filter((b) => b.isActive) || [];
    const activeItems = items?.filter((i) => i.isActive) || [];

    // ✅ Logic to get available units
    const availableUnits = useMemo(() => {
      if (!selectedItem) return PREDEFINED_UNITS;
      // Compare String(i.id) with selectedItem
      const item = activeItems.find(i => String(i.id) === selectedItem);
      if (!item || !item.units || item.units.length === 0) return PREDEFINED_UNITS;

      const parsed = item.units.flatMap(u => u.split('/').map(s => s.trim())).filter(Boolean);
      return [...new Set([...parsed, ...PREDEFINED_UNITS])]; 
    }, [selectedItem, activeItems]);

    // ✅ Submit Mutation (Fixed: Branch Type)
    const submitMutation = useMutation({
      mutationFn: async () => {
        const token = localStorage.getItem("bk_token");
        const promises = cart.map(item => 
          apiRequest("POST", "/api/borrow/transactions/add", {
            token,
            txDate,
            dueDate: dueDate || undefined,
            txType,
            branch:branch, // Convert String back to Number for API
            item: item.name,
            qty: item.qty,
            unit: item.unit,
            borrower,
            lender,
            note
          })
        );
        return Promise.all(promises);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/borrow/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/borrow/dashboard"] });
        toast({ title: t.common.success });
        navigate("/borrow/history");
      },
      onError: (err: any) => {
        toast({ title: err.message || t.common.error, variant: "destructive" });
      },
    });

    // ✅ Add To Cart (Fixed: ID Type Matching)
    const addToCart = () => {
      if (!selectedItem || qty < 1) return;

      // Convert i.id to String for comparison
      const item = activeItems.find((i) => String(i.id) === selectedItem);
      if (!item) return;

      const finalUnit = selectedUnit || availableUnits[0] || "PCS"; 

      // Check cart (cart ids are strings)
      const existingIndex = cart.findIndex((c) => c.id === selectedItem && c.unit === finalUnit); 

      if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].qty += qty;
        setCart(newCart);
      } else {
        setCart([
          ...cart,
          { 
            id: String(item.id), // Store ID as String in Cart
            name: item.name, 
            qty, 
            unit: finalUnit 
          },
        ]);
      }

      // Reset fields
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
      submitMutation.mutate();
    };

    const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

    // ===== Autocomplete Logic =====
    const q = useMemo(() => norm(itemSearchQuery), [itemSearchQuery]);

    const filteredItems = useMemo(() => {
      const list = activeItems;
      if (!q) return list.slice(0, 20);
      return list
        .filter((it) => `${it.code ?? ""} ${it.name ?? ""}`.toLowerCase().includes(q))
        .slice(0, 20);
    }, [activeItems, q]);

    // ✅ Pick Item (Fixed: Duplicate function removed & String conversion added)
    const pickItem = (it: BorrowItem) => {
      setSelectedItem(String(it.id)); // Convert ID to String

      // Auto-select first unit based on split logic
      const rawUnits = it.units || [];
      const parsed = rawUnits.flatMap(u => u.split('/').map(s => s.trim())).filter(Boolean);
      setSelectedUnit(parsed[0] || "");

      setItemSearchQuery(it.code ? `${it.code} - ${it.name}` : it.name);
      setShowItemDropdown(false);
      setHighlightIndex(0);
    };

    // Events for Dropdown
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

    // ✅ Added type for 'e'
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
        if (filteredItems[highlightIndex]) {
          pickItem(filteredItems[highlightIndex]);
        }
      }
    };

    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto p-4 md:p-6 space-y-6 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Add Transaction</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/borrow/history")}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Card className="border-none shadow-none md:border md:shadow-sm">
          <CardContent className="p-0 md:p-6 space-y-4">

            {/* Row 1: Date and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={txDate} 
                  onChange={(e) => setTxDate(e.target.value)} 
                  className="border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                />
              </div>
            </div>

            {/* Row 2: Transaction Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={txType} onValueChange={(v: any) => setTxType(v)}>
                <SelectTrigger className="bg-muted/20">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrow_out">Borrow Out (ยืมออก)</SelectItem>
                  <SelectItem value="borrow_in">Borrow In (ยืมเข้า)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Branch */}
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="bg-muted/20">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}> {/* ✅ Fixed: String(b.id) */}
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="my-4 border-t" />

            {/* Row 4: Item Selection (Autocomplete) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Item Search Input */}
              <div className="md:col-span-6 space-y-2 relative" ref={itemWrapRef}>
                <Label>Item</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={itemInputRef}
                    placeholder="Select item..."
                    className="pl-9 bg-muted/20"
                    value={itemSearchQuery}
                    onChange={(e) => {
                      setItemSearchQuery(e.target.value);
                      setSelectedItem(""); // Clear selection on type
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    onKeyDown={onItemInputKeyDown}
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showItemDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-[200px] overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No items found</div>
                    ) : (
                      filteredItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={`cursor-pointer select-none relative flex items-center rounded-sm px-2 py-1.5 text-sm outline-none ${
                            index === highlightIndex ? "bg-accent text-accent-foreground" : ""
                          }`}
                          onClick={() => pickItem(item)}
                          onMouseEnter={() => setHighlightIndex(index)}
                        >
                          <span className="font-mono text-xs text-muted-foreground mr-2 w-12 shrink-0">
                            {item.code}
                          </span>
                          <span className="truncate">{item.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground opacity-70">
                             {item.units?.join(", ")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Qty */}
              <div className="md:col-span-2 space-y-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && addToCart()}
                  className="bg-muted/20"
                />
              </div>

              {/* Unit */}
              <div className="md:col-span-2 space-y-2">
                <Label>Unit</Label>
                 <Select 
                    value={selectedUnit} 
                    onValueChange={setSelectedUnit}
                    disabled={!selectedItem}
                  >
                  <SelectTrigger className="bg-muted/20">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Button */}
              <div className="md:col-span-2 pb-0.5">
                <Button 
                  type="button" 
                  onClick={addToCart} 
                  disabled={!selectedItem}
                  className="w-full"
                  variant="secondary"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Cart List */}
            {cart.length > 0 && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground grid grid-cols-12 gap-2">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3">Unit</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y">
                  {cart.map((item) => (
                    <div key={`${item.id}-${item.unit}`} className="px-4 py-2 text-sm grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6 font-medium truncate">{item.name}</div>

                      {/* Qty Control */}
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartQty(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.qty}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartQty(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Unit Display/Edit */}
                      <div className="col-span-3">
                          <Select value={item.unit} onValueChange={(val) => updateCartUnit(item.id, val)}>
                              <SelectTrigger className="h-8 border-none shadow-none focus:ring-0">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  {PREDEFINED_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="my-4 border-t" />

            {/* Row 5: People */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Borrower</Label>
                <Input 
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                  className="bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Lender</Label>
                <Input 
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  className="bg-muted/20"
                />
              </div>
            </div>

            {/* Row 6: Note */}
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-muted/20 resize-none"
                rows={2}
              />
            </div>

          </CardContent>
        </Card>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate("/borrow/history")}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitMutation.isPending || cart.length === 0 || !branch}
            className="bg-[#8B5E3C] hover:bg-[#6F4B30] text-white" 
          >
            {submitMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }
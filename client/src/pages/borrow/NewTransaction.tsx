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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, X, Plus, Minus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Type definitions for Cart
interface CartItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
}

const PREDEFINED_UNITS = ["CASE", "PACK", "CASE PACK", "PCS", "BAG", "TRAY", "CAN", "TANK", "ROLL", "BOX", "GAL", "BTL"];

const UNIT_OPTIONS = [
  { value: "PCS", label: "PCS" },
  { value: "CASE", label: "CASE" },
  { value: "PACK", label: "PACK" },
  { value: "BAG", label: "BAG" },
  { value: "TRAY", label: "TRAY" },
  { value: "CAN", label: "CAN" },
  { value: "TANK", label: "TANK" },
  { value: "ROLL", label: "ROLL" },
  { value: "BOX", label: "BOX" },
  { value: "GAL", label: "GAL" },
  { value: "BTL", label: "BTL" },
  { value: "GM", label: "GM" },
] as const;

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export default function NewTransaction() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [txType, setTxType] = useState<"borrow_in" | "borrow_out">("borrow_in");
  const [branch, setBranch] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [borrower, setBorrower] = useState("");
  const [lender, setLender] = useState("");
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Item selection states
  const [selectedItem, setSelectedItem] = useState(""); // itemId stored as String
  const [selectedUnit, setSelectedUnit] = useState("");
  const [unitSearchOpen, setUnitSearchOpen] = useState(false);
  const [qty, setQty] = useState(1);

  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // ✅ Fetch Branches
  const { data: branches, isLoading: branchesLoading } = useQuery<BorrowBranch[]>({
    queryKey: ["/api/borrow/branches"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/borrow/branches", { token: localStorage.getItem("bk_token") });
      const data = await res.json(); // Ensure we parse JSON
      return data.branches || [];
    }
  });

  // ✅ Fetch Items
  const { data: items, isLoading: itemsLoading } = useQuery<BorrowItem[]>({
    queryKey: ["/api/borrow/items"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/borrow/items", { token: localStorage.getItem("bk_token") });
      const data = await res.json(); // Ensure we parse JSON
      return data.items || [];
    }
  });

  const activeBranches = branches?.filter((b) => b.isActive) || [];
  const activeItems = items?.filter((i) => i.isActive) || [];

  const availableUnits = useMemo(() => {
    const standardUnits = ["PCS", "CASE", "PACK", "BAG", "BOX", "TRAY", "CAN", "TANK", "ROLL", "GAL", "BTL"];
    if (!selectedItem) return standardUnits;

    const item = activeItems.find(i => String(i.id) === selectedItem);
    const itemUnits = item?.units || [];
    const parsed = itemUnits.flatMap(u => u.split('/').map(s => s.trim())).filter(Boolean);

    // Dynamic suggestions: Put item-specific units at the top, then predefined ones
    return Array.from(new Set([...parsed, ...standardUnits])); 
  }, [selectedItem, activeItems]);

  // ✅ Submit Mutation (Fixed: Do NOT convert branch to Number)
  const submitMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("bk_token");
      const promises = cart.map(item => 
        apiRequest("POST", "/api/borrow/transactions/add", {
          token,
          txDate,
          dueDate: dueDate || undefined,
          txType,
          branch: branch, // Send as String (ID is like 'br_...')
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

  // ✅ Add To Cart (Fixed: String ID matching)
  const addToCart = () => {
    if (!selectedItem || qty < 1) return;

    // Convert i.id to String for comparison
    const item = activeItems.find((i) => String(i.id) === selectedItem);
    if (!item) return;

    // Default to the first available unit if selectedUnit is empty
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
    setShowItemDropdown(false);
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

  // ✅ Pick Item Helper
  const pickItem = (it: BorrowItem) => {
    const rawUnits = it.units || [];
    const parsed = rawUnits.flatMap(u => u.split('/').map(s => s.trim())).filter(Boolean);
    const firstUnit = parsed[0] || "PCS";

    setSelectedItem(String(it.id));
    setSelectedUnit(firstUnit);
    setShowItemDropdown(false);
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

          {/* Row 3: Branch (Combobox) */}
          <div className="space-y-2">
            <Label>Branch</Label>
            <Popover open={branchOpen} onOpenChange={setBranchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={branchOpen}
                  className="w-full justify-between bg-muted/20 font-normal"
                >
                  {branch
                    ? activeBranches.find((b) => String(b.id) === branch)?.name
                    : "Select branch"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search branch..." />
                  <CommandList>
                    <CommandEmpty>No branch found.</CommandEmpty>
                    <CommandGroup>
                      {activeBranches.map((b) => (
                        <CommandItem
                          key={b.id}
                          value={b.name}
                          onSelect={() => {
                            setBranch(String(b.id));
                            setBranchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              branch === String(b.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {b.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="my-4 border-t" />

          {/* Row 4: Item Selection (Searchable Dropdown) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6 space-y-2">
              <Label>Item</Label>
              <Popover open={showItemDropdown} onOpenChange={setShowItemDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={showItemDropdown}
                    className="w-full justify-between bg-muted/20 font-normal"
                  >
                    {selectedItem
                      ? activeItems.find((it) => String(it.id) === selectedItem)?.name
                      : "Select item..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search item..." />
                    <CommandList>
                      <CommandEmpty>No item found.</CommandEmpty>
                      <CommandGroup>
                        {activeItems.map((it) => (
                          <CommandItem
                            key={it.id}
                            value={it.name}
                            onSelect={() => {
                              pickItem(it);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedItem === String(it.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="font-mono text-xs text-muted-foreground mr-2">{it.code}</span>
                            {it.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

            {/* Unit Dropdown */}
            <div className="md:col-span-2 space-y-2">
              <Label>Unit</Label>
              <Popover open={unitSearchOpen} onOpenChange={setUnitSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unitSearchOpen}
                    className="w-full justify-between bg-muted/20 font-normal"
                    disabled={!selectedItem}
                    data-testid="select-unit"
                  >
                    {selectedUnit || "Unit"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search unit..." />
                    <CommandList>
                      <CommandEmpty>No unit found.</CommandEmpty>
                      <CommandGroup>
                        {availableUnits.map((u) => (
                          <CommandItem
                            key={u}
                            value={u}
                            onSelect={(currentValue) => {
                              setSelectedUnit(currentValue.toUpperCase());
                              setUnitSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUnit === u ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {u}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

                    {/* Unit Display/Edit (Cart) */}
                    <div className="col-span-3">
                        <Select value={item.unit} onValueChange={(val) => updateCartUnit(item.id, val)}>
                            <SelectTrigger className="h-8 border-none shadow-none focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {(() => {
                                    const originalItem = activeItems.find(i => String(i.id) === item.id);
                                    const specificUnits = originalItem?.units
                                        ?.flatMap(u => u.split('/').map(s => s.trim()))
                                        .filter(Boolean) || [];

                                    const allUnitValues = Array.from(new Set([
                                        ...specificUnits, 
                                        ...UNIT_OPTIONS.map(o => o.value)
                                    ]));

                                    return allUnitValues.map(unitValue => {
                                        const match = UNIT_OPTIONS.find(o => o.value === unitValue);
                                        const label = match ? match.label : unitValue;
                                        return (
                                            <SelectItem key={unitValue} value={unitValue}>
                                                {label}
                                            </SelectItem>
                                        );
                                    });
                                })()}
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
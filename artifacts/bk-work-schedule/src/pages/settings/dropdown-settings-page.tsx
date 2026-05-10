import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";

interface DropdownOption {
  id: number;
  category: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

const CATEGORIES = [
  { key: "manager_shift", labelTh: "กะผู้จัดการ (Manager Shift)", labelEn: "Manager Shift" },
  { key: "staff_shift", labelTh: "กลุ่มกะพนักงาน (Staff Shift Group)", labelEn: "Staff Shift Group" },
];

function SortableItem({
  option,
  isAdmin,
  language,
  onEdit,
  onDelete,
}: {
  option: DropdownOption;
  isAdmin: boolean;
  language: string;
  onEdit: (option: DropdownOption) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
      data-testid={`row-option-${option.id}`}
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${option.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium" data-testid={`text-option-label-${option.id}`}>
          {option.label}
        </span>
        {option.value !== option.label && (
          <span className="text-xs text-muted-foreground ml-2">({option.value})</span>
        )}
      </div>
      <Badge variant={option.isActive ? "default" : "secondary"} className="text-xs">
        {option.isActive
          ? language === "th" ? "ใช้งาน" : "Active"
          : language === "th" ? "ปิด" : "Inactive"}
      </Badge>
      {isAdmin && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(option)}
            data-testid={`button-edit-${option.id}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(option.id)}
            data-testid={`button-delete-${option.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DropdownSettingsPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [seeding, setSeeding] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user && !isAdmin) {
      setLocation("/settings");
    }
  }, [user, isAdmin, setLocation]);

  const loadOptions = async (category: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dropdown-options/${category}`);
      const data = await res.json();
      if (data.ok) {
        setOptions(data.options);
      }
    } catch (error) {
      console.error("Failed to load dropdown options:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions(activeCategory);
  }, [activeCategory]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/dropdown-options/seed", { token });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: language === "th" ? "สำเร็จ" : "Success",
          description: language === "th" ? "เพิ่มค่าเริ่มต้นเรียบร้อย" : "Default values seeded successfully",
        });
        loadOptions(activeCategory);
      }
    } catch (error) {
      toast({
        title: language === "th" ? "ผิดพลาด" : "Error",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = async () => {
    if (!newValue || !newLabel) return;
    try {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("POST", "/api/dropdown-options", {
        token,
        category: activeCategory,
        value: newValue,
        label: newLabel,
        sortOrder: options.length,
        isActive: true,
      });
      const data = await res.json();
      if (data.ok) {
        setOptions([...options, data.option]);
        setNewValue("");
        setNewLabel("");
        setAddDialogOpen(false);
        toast({
          title: language === "th" ? "เพิ่มสำเร็จ" : "Added",
        });
      }
    } catch (error) {
      toast({
        title: language === "th" ? "ผิดพลาด" : "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingOption || !newValue || !newLabel) return;
    try {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("PUT", `/api/dropdown-options/${editingOption.id}`, {
        token,
        value: newValue,
        label: newLabel,
      });
      const data = await res.json();
      if (data.ok) {
        setOptions(options.map((o) => (o.id === editingOption.id ? data.option : o)));
        setEditDialogOpen(false);
        setEditingOption(null);
        setNewValue("");
        setNewLabel("");
        toast({
          title: language === "th" ? "แก้ไขสำเร็จ" : "Updated",
        });
      }
    } catch (error) {
      toast({
        title: language === "th" ? "ผิดพลาด" : "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("bk_token");
      const res = await apiRequest("DELETE", `/api/dropdown-options/${id}`, { token });
      const data = await res.json();
      if (data.ok) {
        setOptions(options.filter((o) => o.id !== id));
        toast({
          title: language === "th" ? "ลบสำเร็จ" : "Deleted",
        });
      }
    } catch (error) {
      toast({
        title: language === "th" ? "ผิดพลาด" : "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);

    const reordered = arrayMove(options, oldIndex, newIndex);
    const updated = reordered.map((o, i) => ({ ...o, sortOrder: i }));
    setOptions(updated);

    try {
      const token = localStorage.getItem("bk_token");
      await Promise.all(
        updated.map((o, i) =>
          apiRequest("PUT", `/api/dropdown-options/${o.id}`, { token, sortOrder: i })
        )
      );
    } catch (error) {
      loadOptions(activeCategory);
      toast({
        title: language === "th" ? "ผิดพลาด" : "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (option: DropdownOption) => {
    setEditingOption(option);
    setNewValue(option.value);
    setNewLabel(option.label);
    setEditDialogOpen(true);
  };

  const categoryLabel = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">
            {language === "th" ? "จัดการ Dropdown" : "Dropdown Settings"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === "th"
              ? "เพิ่ม/แก้ไข/ลบตัวเลือก dropdown ต่างๆ"
              : "Add/edit/remove dropdown options"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            data-testid={`button-tab-${cat.key}`}
          >
            {language === "th" ? cat.labelTh : cat.labelEn}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base" data-testid="text-category-title">
                {language === "th" ? categoryLabel?.labelTh : categoryLabel?.labelEn}
              </CardTitle>
              <CardDescription>
                {options.length} {language === "th" ? "รายการ" : "items"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {options.length === 0 && isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeed}
                  disabled={seeding}
                  data-testid="button-seed"
                >
                  {seeding && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {language === "th" ? "เพิ่มค่าเริ่มต้น" : "Seed Defaults"}
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setNewValue("");
                    setNewLabel("");
                    setAddDialogOpen(true);
                  }}
                  className="gap-1"
                  data-testid="button-add-option"
                >
                  <Plus className="h-3 w-3" />
                  {language === "th" ? "เพิ่ม" : "Add"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-empty">
              {language === "th"
                ? "ยังไม่มีรายการ กดปุ่ม 'เพิ่มค่าเริ่มต้น' หรือ 'เพิ่ม' เพื่อเริ่มต้น"
                : "No items yet. Click 'Seed Defaults' or 'Add' to get started."}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={options.map((o) => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {options.map((option) => (
                    <SortableItem
                      key={option.id}
                      option={option}
                      isAdmin={isAdmin}
                      language={language}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "th" ? "เพิ่มตัวเลือกใหม่" : "Add New Option"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {language === "th" ? "ค่า (Value)" : "Value"}
              </label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g. 07:00-16:00"
                data-testid="input-new-value"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {language === "th" ? "ป้ายกำกับ (Label)" : "Label"}
              </label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. 07:00-16:00"
                data-testid="input-new-label"
              />
            </div>
            <Button onClick={handleAdd} className="w-full" data-testid="button-confirm-add">
              {language === "th" ? "เพิ่ม" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "th" ? "แก้ไขตัวเลือก" : "Edit Option"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {language === "th" ? "ค่า (Value)" : "Value"}
              </label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                data-testid="input-edit-value"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {language === "th" ? "ป้ายกำกับ (Label)" : "Label"}
              </label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                data-testid="input-edit-label"
              />
            </div>
            <Button onClick={handleEdit} className="w-full" data-testid="button-confirm-edit">
              {language === "th" ? "บันทึก" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
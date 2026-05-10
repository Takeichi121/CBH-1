import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Palette, MessageSquare, X } from "lucide-react";

export interface ChatCustomization {
  bubbleColor: string;
  bubbleStyle: "rounded" | "sharp" | "pill";
  avatarStyle: "circle" | "square" | "rounded";
}

const defaultCustomization: ChatCustomization = {
  bubbleColor: "primary",
  bubbleStyle: "rounded",
  avatarStyle: "circle",
};

const bubbleColors = [
  { id: "primary", label: "Default", class: "bg-primary", previewClass: "bg-primary" },
  { id: "blue", label: "Blue", class: "bg-blue-600 dark:bg-blue-500", previewClass: "bg-blue-600" },
  { id: "green", label: "Green", class: "bg-green-600 dark:bg-green-500", previewClass: "bg-green-600" },
  { id: "purple", label: "Purple", class: "bg-purple-600 dark:bg-purple-500", previewClass: "bg-purple-600" },
  { id: "orange", label: "Orange", class: "bg-orange-600 dark:bg-orange-500", previewClass: "bg-orange-600" },
  { id: "pink", label: "Pink", class: "bg-pink-600 dark:bg-pink-500", previewClass: "bg-pink-600" },
  { id: "cyan", label: "Cyan", class: "bg-cyan-600 dark:bg-cyan-500", previewClass: "bg-cyan-600" },
  { id: "rose", label: "Rose", class: "bg-rose-600 dark:bg-rose-500", previewClass: "bg-rose-600" },
];

const bubbleStyles = [
  { id: "rounded", label: "Rounded", class: "rounded-2xl" },
  { id: "sharp", label: "Sharp", class: "rounded-md" },
  { id: "pill", label: "Pill", class: "rounded-full" },
];

const avatarStyles = [
  { id: "circle", label: "Circle", class: "rounded-full" },
  { id: "square", label: "Square", class: "rounded-none" },
  { id: "rounded", label: "Rounded", class: "rounded-lg" },
];

function getStoredCustomization(): ChatCustomization {
  if (typeof window === 'undefined') return defaultCustomization;
  const saved = localStorage.getItem("bk_chat_customization");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultCustomization;
    }
  }
  return defaultCustomization;
}

export function useChatCustomization() {
  const [customization, setCustomization] = useState<ChatCustomization>(getStoredCustomization);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleStorageChange = () => {
      setCustomization(getStoredCustomization());
      setVersion(v => v + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('chatCustomizationChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatCustomizationChanged', handleStorageChange);
    };
  }, []);

  const updateCustomization = (updates: Partial<ChatCustomization>) => {
    const newCustomization = { ...customization, ...updates };
    setCustomization(newCustomization);
    localStorage.setItem("bk_chat_customization", JSON.stringify(newCustomization));
    window.dispatchEvent(new CustomEvent('chatCustomizationChanged'));
  };

  const getBubbleColorClass = () => {
    const color = bubbleColors.find(c => c.id === customization.bubbleColor);
    return color?.class || "bg-primary";
  };

  const getBubbleStyleClass = () => {
    const style = bubbleStyles.find(s => s.id === customization.bubbleStyle);
    return style?.class || "rounded-2xl";
  };

  const getAvatarStyleClass = () => {
    const style = avatarStyles.find(s => s.id === customization.avatarStyle);
    return style?.class || "rounded-full";
  };

  return {
    customization,
    updateCustomization,
    getBubbleColorClass,
    getBubbleStyleClass,
    getAvatarStyleClass,
  };
}

interface ChatCustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatCustomizationPanel({ isOpen, onClose }: ChatCustomizationPanelProps) {
  const { customization, updateCustomization, getBubbleColorClass, getBubbleStyleClass, getAvatarStyleClass } = useChatCustomization();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="container-chat-customization">
      <Card className="w-[380px] max-w-[90vw] max-h-[80vh] overflow-y-auto shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="w-5 h-5" />
            ปรับแต่งแชท
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-customization">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">สีกล่องข้อความ</Label>
            <div className="grid grid-cols-4 gap-2">
              {bubbleColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => updateCustomization({ bubbleColor: color.id })}
                  className={cn(
                    "w-full h-10 rounded-lg transition-all",
                    color.class,
                    customization.bubbleColor === color.id 
                      ? "ring-2 ring-offset-2 ring-primary scale-110" 
                      : "hover:scale-105"
                  )}
                  title={color.label}
                  data-testid={`button-color-${color.id}`}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">รูปแบบกล่องข้อความ</Label>
            <RadioGroup
              value={customization.bubbleStyle}
              onValueChange={(value) => updateCustomization({ bubbleStyle: value as any })}
              className="flex gap-4"
            >
              {bubbleStyles.map((style) => (
                <div key={style.id} className="flex items-center gap-2">
                  <RadioGroupItem value={style.id} id={`bubble-${style.id}`} />
                  <Label htmlFor={`bubble-${style.id}`} className="cursor-pointer">
                    <div className={cn("w-16 h-8 bg-muted flex items-center justify-center", style.class)}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">รูปแบบอวาตาร์</Label>
            <RadioGroup
              value={customization.avatarStyle}
              onValueChange={(value) => updateCustomization({ avatarStyle: value as any })}
              className="flex gap-4"
            >
              {avatarStyles.map((style) => (
                <div key={style.id} className="flex items-center gap-2">
                  <RadioGroupItem value={style.id} id={`avatar-${style.id}`} />
                  <Label htmlFor={`avatar-${style.id}`} className="cursor-pointer">
                    <div className={cn("w-10 h-10 bg-primary/20 flex items-center justify-center", style.class)}>
                      <span className="text-xs font-bold">CBH</span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-3 block">ตัวอย่าง</Label>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-end">
                <div className={cn(
                  "px-4 py-2 text-white text-sm max-w-[70%]",
                  getBubbleColorClass(),
                  getBubbleStyleClass()
                )}>
                  สวัสดีครับ!
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className={cn(
                  "w-8 h-8 bg-primary/20 flex items-center justify-center flex-shrink-0",
                  getAvatarStyleClass()
                )}>
                  <span className="text-xs font-bold">CH</span>
                </div>
                <div className="bg-muted px-4 py-2 rounded-2xl text-sm">
                  สวัสดีครับนาย!
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useBookShift } from "@/hooks/use-shifts";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const bookSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shiftGroup: z.string().min(1, "Shift group is required"),
  startTime: z.string().min(1, "Time period is required"),
  note: z.string().optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

interface BookShiftDialogProps {
  children: React.ReactNode;
  groups: any[];
  day: string;
  disabled?: boolean;
  settings: any;
}

export function BookShiftDialog({ children, groups, day, disabled, settings }: BookShiftDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { mutate: bookShift, isPending } = useBookShift();
  
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      date: day,
      shiftGroup: "",
      startTime: "",
      note: "",
    },
  });

  if (disabled) return <div className="opacity-50 cursor-not-allowed">{children}</div>;

  const onSubmit = (data: BookFormValues) => {
    bookShift(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {t("bookShift")} - {format(parseISO(day), "EEE, MMM d")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t("shiftGroup")}</Label>
            <Select onValueChange={(val) => {
              form.setValue("shiftGroup", val);
              const grp = groups?.find(g => g.key === val);
              if (grp?.times?.[0]) {
                form.setValue("startTime", grp.times[0]);
              }
            }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("shiftGroup")} />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((g: any) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.shiftGroup && <p className="text-xs text-red-500">{form.formState.errors.shiftGroup.message}</p>}
          </div>

          {form.watch("shiftGroup") && (
            <div className="space-y-2">
              <Label>{t("startTime")}</Label>
              <Select 
                onValueChange={(val) => form.setValue("startTime", val)} 
                defaultValue={form.getValues("startTime")}
                disabled={settings?.lockTimePeriod}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("startTime")} />
                </SelectTrigger>
                <SelectContent>
                  {groups?.find(g => g.key === form.watch("shiftGroup"))?.times?.map((time: string) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {settings?.lockTimePeriod && <p className="text-[10px] text-muted-foreground">Fixed by Manager</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("note")} ({t("ok")})</Label>
            <Textarea {...form.register("note")} className="rounded-xl resize-none" placeholder={t("note")} />
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={isPending} data-testid="button-confirm-booking">
            {isPending ? t("loading") : t("bookShift")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

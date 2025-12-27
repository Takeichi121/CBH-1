import { Card } from "@/components/ui/card";
import { Clock, MessageSquare, Briefcase } from "lucide-react";
import { format, parseISO } from "date-fns";

type ShiftCardProps = {
  date: string;
  startTime: string;
  endTime: string;
  shiftGroup: string;
  note?: string;
  role?: string;
  fullName?: string;
  onCancel?: () => void;
  showDate?: boolean;
};

export function ShiftCard({ 
  date, 
  startTime, 
  endTime, 
  shiftGroup, 
  note, 
  role,
  fullName,
  onCancel,
  showDate = true
}: ShiftCardProps) {
  
  const groupColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200",
    lunch: "bg-orange-100 text-orange-700 border-orange-200",
    dinner: "bg-purple-100 text-purple-700 border-purple-200",
    late: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const badgeClass = groupColors[shiftGroup.toLowerCase()] || "bg-gray-100 text-gray-700";

  return (
    <Card className="glass-card p-4 relative overflow-hidden group">
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          {showDate && (
            <h3 className="font-display font-bold text-lg text-foreground">
              {format(parseISO(date), "EEEE, MMM d")}
            </h3>
          )}
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass} mt-1 uppercase tracking-wider`}>
            {shiftGroup}
          </div>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2 text-primary" />
          <span className="font-medium text-foreground">{startTime} - {endTime}</span>
        </div>

        {fullName && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Briefcase className="w-4 h-4 mr-2 text-primary" />
            <span>{fullName} ({role})</span>
          </div>
        )}

        {note && (
          <div className="flex items-start text-sm text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
            <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
            <span className="italic">{note}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

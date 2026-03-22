import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

interface AddToCalendarBtnProps {
  title: string;
  startTime: Date;
  endTime: Date;
}

export function AddToCalendarBtn({ title, startTime, endTime }: AddToCalendarBtnProps) {
  const handleAddToCalendar = () => {
    const formatTime = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const start = formatTime(startTime);
    const end = formatTime(endTime);

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${start}/${end}&details=Work+Shift+at+CBH+Grand+Diamond&location=Grand+Diamond`;

    window.open(googleUrl, "_blank");
  };

  return (
    <Button variant="outline" size="sm" onClick={handleAddToCalendar} data-testid="button-add-to-calendar">
      <CalendarPlus className="mr-2 h-4 w-4" />
      Add to Calendar
    </Button>
  );
}

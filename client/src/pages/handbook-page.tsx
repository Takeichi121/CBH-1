import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import { BookOpen, Clock, Calendar, ShieldCheck, HelpCircle } from "lucide-react";

export default function HandbookPage() {
  const { t } = useI18n();

  const sections = [
    {
      title: t("workingHoursTitle"),
      icon: Clock,
      content: t("workingHoursContent"),
    },
    {
      title: t("bookingRulesTitle"),
      icon: Calendar,
      content: t("bookingRulesContent"),
    },
    {
      title: t("responsibilitiesTitle"),
      icon: ShieldCheck,
      content: t("responsibilitiesContent"),
    },
    {
      title: t("supportTitle"),
      icon: HelpCircle,
      content: t("supportContent"),
    },
  ];

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">
          {t("handbookTitle")}
        </h1>
      </div>

      <div className="grid gap-6">
        {sections.map((section, idx) => (
          <Card key={idx} className="hover-elevate">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="p-2 bg-primary/10 rounded-full">
                <section.icon className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {section.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm text-center text-muted-foreground">
            {t("handbookFooter")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

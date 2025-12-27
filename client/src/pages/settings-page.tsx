import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();

  const form = useForm();

  // Redirect if not manager
  if (user && user.role !== "manager" && user.role !== "admin") {
    setLocation("/work");
    return null;
  }

  useEffect(() => {
    if (data?.capacity) {
      form.reset(data.capacity);
    }
  }, [data, form]);

  const onSubmit = (values: any) => {
    // Ensure numbers
    const payload: Record<string, number> = {};
    Object.keys(values).forEach(key => {
      payload[key] = Number(values[key]);
    });
    updateSettings(payload);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;

  const groups = data?.groups || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage system configuration</p>
      </div>

      <Card className="glass-card border-none shadow-xl">
        <CardHeader>
          <CardTitle>Shift Capacity</CardTitle>
          <CardDescription>
            Set the maximum number of staff allowed per shift group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map((group: any) => (
                <div key={group.key} className="space-y-2">
                  <Label className="text-base font-medium">{group.label}</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {group.windowStart} - {group.windowEnd}
                  </p>
                  <Input 
                    type="number" 
                    min="0"
                    {...form.register(group.key)} 
                    className="h-11 text-lg font-semibold text-center"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" className="rounded-xl shadow-lg shadow-primary/20" disabled={isPending}>
                {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

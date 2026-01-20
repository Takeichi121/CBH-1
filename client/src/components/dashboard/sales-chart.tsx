import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SalesData {
  reportDate: string;
  actual_sales: number;
  transaction_count: number;
}

export function SalesChart() {
  const { data, isLoading, error } = useQuery<SalesData[]>({
    queryKey: ["/api/sales/history"],
    queryFn: async () => {
      const token = localStorage.getItem("token") || "";
      const res = await apiRequest("POST", "/api/sales/history", { token });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load data");
      return json.data || [];
    },
  });

  if (isLoading) {
    return (
      <Card className="col-span-4 h-[350px] flex items-center justify-center" data-testid="card-sales-chart-loading">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <Card className="col-span-4" data-testid="card-sales-chart-empty">
        <CardHeader>
          <CardTitle>ยอดขาย 7 วันย้อนหลัง</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">ยังไม่มีข้อมูลยอดขาย</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4" data-testid="card-sales-chart">
      <CardHeader>
        <CardTitle>ยอดขาย 7 วันย้อนหลัง</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="reportDate"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
                }
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `฿${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  color: "hsl(var(--card-foreground))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`฿${value.toLocaleString()}`, "ยอดขาย"]}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("th-TH", { dateStyle: "long" })
                }
              />
              <Line
                type="monotone"
                dataKey="actual_sales"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

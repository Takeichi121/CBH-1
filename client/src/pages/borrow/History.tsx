import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History as HistoryIcon, ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import type { BorrowTransaction, BorrowBranch } from "@shared/schema";

export default function History() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // ✅ Fetch Transactions (ใช้ POST พร้อม Token ตาม Backend)
  const { data: transactions, isLoading: isLoadingTx } = useQuery<BorrowTransaction[]>({
    queryKey: ["/api/borrow/transactions"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/borrow/transactions", { 
        token: localStorage.getItem("bk_token"),
        limit: 100 // ดึง 100 รายการล่าสุด
      });
      return res.transactions;
    }
  });

  // ✅ Fetch Branches (ใช้ POST พร้อม Token)
  const { data: branches, isLoading: isLoadingBranches } = useQuery<BorrowBranch[]>({
    queryKey: ["/api/borrow/branches"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/borrow/branches", { 
        token: localStorage.getItem("bk_token") 
      });
      return res.branches;
    }
  });

  // ✅ Mark Done Mutation (ใช้ Toggle Endpoint)
  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", "/api/borrow/transactions/toggle", { 
        token: localStorage.getItem("bk_token"),
        id 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrow/transactions"] });
      toast({ title: t.common.success });
    },
    onError: (err: any) => {
      toast({ title: err.message || t.common.error, variant: "destructive" });
    }
  });

  const filteredTransactions = transactions?.filter((tx) => {
    if (filterBranch !== "all" && tx.branch !== filterBranch) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    return true;
  });

  // ใช้รายชื่อสาขาจาก API หรือดึงจาก Transaction ก็ได้
  const branchOptions = branches?.map(b => b.name) || [...new Set(transactions?.map((tx) => tx.branch) || [])];

  const isLoading = isLoadingTx || isLoadingBranches;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5" />
              {t.history.title}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter Branch */}
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-branch">
                  <SelectValue placeholder={t.history.filterBranch} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.all}</SelectItem>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-status">
                  <SelectValue placeholder={t.history.filterStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.all}</SelectItem>
                  <SelectItem value="pending">{t.history.pending}</SelectItem>
                  <SelectItem value="done">{t.history.done}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredTransactions && filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.history.date}</TableHead>
                    <TableHead>{t.history.type}</TableHead>
                    <TableHead>{t.history.branch}</TableHead>
                    <TableHead>{t.history.item}</TableHead>
                    <TableHead className="text-right">{t.history.qty}</TableHead>
                    <TableHead className="text-center">{t.history.status}</TableHead>
                    <TableHead className="text-right">{t.history.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`} className={tx.status === "done" ? "opacity-60 bg-muted/50" : ""}>
                      <TableCell className="font-mono text-sm">
                        {tx.txDate}
                        {tx.dueDate && tx.status === "pending" && (
                           <div className="text-xs text-muted-foreground mt-1">Due: {tx.dueDate}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={tx.txType === "borrow_in" 
                            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 gap-1" 
                            : "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 gap-1"}
                        >
                          {tx.txType === "borrow_in" ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3" />
                              {t.history.borrowIn}
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              {t.history.borrowOut}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.branch}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{tx.item}</span>
                          {tx.unit && (
                            <span className="text-muted-foreground text-sm ml-1">
                              ({tx.unit})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {tx.qty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={tx.status === "done" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {tx.status === "done" ? t.history.done : t.history.pending}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markDoneMutation.mutate(tx.id)}
                            disabled={markDoneMutation.isPending}
                            data-testid={`button-mark-done-${tx.id}`}
                            className="h-8"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {t.history.markDone}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t.history.noRecords}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
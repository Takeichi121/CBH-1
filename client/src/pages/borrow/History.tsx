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
import type { Transaction, Branch } from "@shared/schema";

export default function History() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/transactions/${id}/done`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: t.common.success });
    },
  });

  const filteredTransactions = transactions?.filter((tx) => {
    if (filterBranch !== "all" && tx.branch !== filterBranch) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    return true;
  });

  const uniqueBranches = [...new Set(transactions?.map((tx) => tx.branch) || [])];

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
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-branch">
                  <SelectValue placeholder={t.history.filterBranch} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.all}</SelectItem>
                  {uniqueBranches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <TableHead>{t.history.status}</TableHead>
                    <TableHead className="text-right">{t.history.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-mono text-sm">
                        {tx.txDate}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.txType === "borrow_in" ? "default" : "destructive"}
                          className="gap-1"
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
                      <TableCell>
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
                          >
                            <Check className="h-4 w-4 mr-1" />
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

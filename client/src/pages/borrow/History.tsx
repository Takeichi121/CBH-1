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
import { BorrowLayout } from "./borrow-layout";
import type { BorrowTransaction, BorrowBranch } from "@shared/schema";

export default function History() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // ... (existing state and queries) ...

  const isLoading = isLoadingTx || isLoadingBranches;

  return (
    <BorrowLayout>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5" />
              {t.history.borrowTracker}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter Branch */}
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-branch">
                  <SelectValue placeholder={t.history.branchName} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.viewAll}</SelectItem>
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
                  <SelectValue placeholder={t.history.status || "Status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.history.viewAll}</SelectItem>
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
                    <TableHead>{t.history.requestType}</TableHead>
                    <TableHead>{t.history.branchName}</TableHead>
                    <TableHead>{t.history.borrowTracker}</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-center">{t.history.status || "Status"}</TableHead>
                    <TableHead className="text-right">{t.history.approve || "Action"}</TableHead>
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
                              {t.history.borrowTracker} In
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              {t.history.borrowTracker} Out
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
                            {t.history.ok}
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
              {t.history.noRequests || "No records"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
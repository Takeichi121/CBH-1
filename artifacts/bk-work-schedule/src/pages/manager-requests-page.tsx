import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { todayBangkok } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar, Check, X, Trash2, FileText, AlertCircle } from "lucide-react";

const REQUEST_TYPES = [
  { value: "select_work_time", labelKey: "selectWorkTime" },
  { value: "day_off", labelKey: "dayOff" },
  { value: "compensate_leave", labelKey: "compensateLeave" },
  { value: "annual_leave", labelKey: "annualLeave" },
  { value: "without_pay", labelKey: "withoutPay" },
] as const;

const DAY_OFF_REASONS = [
  { value: "doctor", labelKey: "doctorAppointment" },
  { value: "personal", labelKey: "personalMatter" },
  { value: "family", labelKey: "familyMatter" },
  { value: "other", labelKey: "otherReason" },
] as const;

export default function ManagerRequestsPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const token = localStorage.getItem("bk_token") || "";
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  const isAdmin = user?.role === "admin";
  const isStoreManager = user?.role === "manager" && user?.position === "store_manager";
  const canApprove = isAdmin || isStoreManager;

  const { data: myRequestsData, isLoading: loadingMyRequests } = useQuery<{ ok: boolean; requests?: any[] }>({
    queryKey: [api.managerRequests.getMyRequests.path, year, month],
    queryFn: async () => {
      const res = await apiRequest("POST", api.managerRequests.getMyRequests.path, { token, year, month });
      return res.json();
    },
  });

  const { data: allRequestsData, isLoading: loadingAllRequests } = useQuery<{ ok: boolean; requests?: any[] }>({
    queryKey: [api.managerRequests.getAllRequests.path],
    queryFn: async () => {
      const res = await apiRequest("POST", api.managerRequests.getAllRequests.path, { token });
      return res.json();
    },
    enabled: canApprove,
  });

  const { data: selectCountData } = useQuery<{ ok: boolean; count?: number }>({
    queryKey: [api.managerRequests.getSelectWorkTimeCount.path, year, month],
    queryFn: async () => {
      const res = await apiRequest("POST", api.managerRequests.getSelectWorkTimeCount.path, { token, year, month });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.managerRequests.create.path, { token, ...data });
      return res.json();
    },
    onSuccess: (res: any) => {
      if (res.ok) {
        toast({ title: t("requestCreated") });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getMyRequests.path] });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getAllRequests.path] });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getSelectWorkTimeCount.path] });
        setCreateDialogOpen(false);
      } else {
        toast({ title: res.message || "Failed to create request", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Network error", variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", api.managerRequests.approve.path, { token, requestId });
      return res.json();
    },
    onSuccess: (res: any) => {
      if (res.ok) {
        toast({ title: t("requestApproved") });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getMyRequests.path] });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getAllRequests.path] });
      } else {
        toast({ title: res.message || "Failed to approve request", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Network error", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: number; reason?: string }) => {
      const res = await apiRequest("POST", api.managerRequests.reject.path, { token, requestId, reason });
      return res.json();
    },
    onSuccess: (res: any) => {
      if (res.ok) {
        toast({ title: t("requestRejected") });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getMyRequests.path] });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getAllRequests.path] });
        setRejectDialogOpen(false);
        setSelectedRequestId(null);
        setRejectReason("");
      } else {
        toast({ title: res.message || "Failed to reject request", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Network error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", api.managerRequests.delete.path, { token, requestId });
      return res.json();
    },
    onSuccess: (res: any) => {
      if (res.ok) {
        toast({ title: t("requestDeleted") });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getMyRequests.path] });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getAllRequests.path] });
        queryClient.invalidateQueries({ queryKey: [api.managerRequests.getSelectWorkTimeCount.path] });
      } else {
        toast({ title: res.message || "Failed to delete request", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Network error", variant: "destructive" }),
  });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-600">{t("approved")}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t("rejected")}</Badge>;
      default:
        return <Badge variant="secondary">{t("pending")}</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const found = REQUEST_TYPES.find((r) => r.value === type);
    return found ? t(found.labelKey as any) : type;
  };

  const selectWorkTimeCount = selectCountData?.count || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-semibold">{t("managerRequest")}</h1>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={handlePrevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentDate, language === "th" ? "MMMM yyyy" : "MMMM yyyy")}
            </span>
            <Button size="icon" variant="ghost" onClick={handleNextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="my-requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-requests" data-testid="tab-my-requests">{t("myRequests")}</TabsTrigger>
            {canApprove && (
              <TabsTrigger value="all-requests" data-testid="tab-all-requests">{t("allRequests")}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-requests" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{t("selectWorkTimeLimit")}: {selectWorkTimeCount}/2 {t("selectWorkTimeUsed")}</span>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-create-request">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("createRequest")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("createRequest")}</DialogTitle>
                  </DialogHeader>
                  <CreateRequestForm
                    onSubmit={(data) => createMutation.mutate(data)}
                    isPending={createMutation.isPending}
                    selectWorkTimeCount={selectWorkTimeCount}
                    t={t}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {loadingMyRequests ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <RequestsList
                requests={myRequestsData?.requests || []}
                getStatusBadge={getStatusBadge}
                getRequestTypeLabel={getRequestTypeLabel}
                onDelete={(id) => deleteMutation.mutate(id)}
                canDelete
                t={t}
              />
            )}
          </TabsContent>

          {canApprove && (
            <TabsContent value="all-requests" className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">{t("pendingRequests")}</span>
              </div>
              {loadingAllRequests ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <RequestsList
                  requests={allRequestsData?.requests || []}
                  getStatusBadge={getStatusBadge}
                  getRequestTypeLabel={getRequestTypeLabel}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => {
                    setSelectedRequestId(id);
                    setRejectDialogOpen(true);
                  }}
                  canApprove
                  t={t}
                />
              )}
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("reject")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("rejectReason")}</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="..."
                  data-testid="input-reject-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedRequestId && rejectMutation.mutate({ requestId: selectedRequestId, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {t("reject")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CreateRequestForm({
  onSubmit,
  isPending,
  selectWorkTimeCount,
  t,
}: {
  onSubmit: (data: any) => void;
  isPending: boolean;
  selectWorkTimeCount: number;
  t: (key: any) => string;
}) {
  const [requestType, setRequestType] = useState("");
  const [requestDate, setRequestDate] = useState(todayBangkok());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [dayOffReason, setDayOffReason] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      requestType,
      requestDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      dayOffReason: dayOffReason || undefined,
      note: note || undefined,
    });
  };

  const isSelectWorkTime = requestType === "select_work_time";
  const isDayOff = requestType === "day_off";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("requestType")}</Label>
        <Select value={requestType} onValueChange={setRequestType}>
          <SelectTrigger data-testid="select-request-type">
            <SelectValue placeholder={t("requestType")} />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_TYPES.map((type) => (
              <SelectItem
                key={type.value}
                value={type.value}
                disabled={type.value === "select_work_time" && selectWorkTimeCount >= 2}
              >
                {t(type.labelKey as any)}
                {type.value === "select_work_time" && selectWorkTimeCount >= 2 && " (2/2)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("requestDate")}</Label>
        <Input
          type="date"
          value={requestDate}
          onChange={(e) => setRequestDate(e.target.value)}
          data-testid="input-request-date"
        />
      </div>

      {isSelectWorkTime && (
        <>
          <div className="space-y-2">
            <Label>{t("startTime")}</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              data-testid="input-start-time"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("endTime")}</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              data-testid="input-end-time"
            />
          </div>
        </>
      )}

      {isDayOff && (
        <div className="space-y-2">
          <Label>{t("dayOffReason")}</Label>
          <Select value={dayOffReason} onValueChange={setDayOffReason}>
            <SelectTrigger data-testid="select-day-off-reason">
              <SelectValue placeholder={t("dayOffReason")} />
            </SelectTrigger>
            <SelectContent>
              {DAY_OFF_REASONS.map((reason) => (
                <SelectItem key={reason.value} value={reason.value}>
                  {t(reason.labelKey as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t("note")}</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="..."
          data-testid="input-note"
        />
      </div>

      <Button
        type="submit"
        disabled={!requestType || !requestDate || isPending}
        className="w-full"
        data-testid="button-submit-request"
      >
        {t("submit")}
      </Button>
    </form>
  );
}

function RequestsList({
  requests,
  getStatusBadge,
  getRequestTypeLabel,
  onDelete,
  onApprove,
  onReject,
  canDelete,
  canApprove,
  t,
}: {
  requests: any[];
  getStatusBadge: (status: string) => React.ReactNode;
  getRequestTypeLabel: (type: string) => string;
  onDelete?: (id: number) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  canDelete?: boolean;
  canApprove?: boolean;
  t: (key: any) => string;
}) {
  if (!requests.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t("noRequests")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium">{getRequestTypeLabel(request.requestType)}</span>
                  {getStatusBadge(request.status)}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(request.requestDate), "dd/MM/yyyy")}</span>
                  {request.startTime && request.endTime && (
                    <>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{request.startTime} - {request.endTime}</span>
                    </>
                  )}
                </div>
                {request.dayOffReason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("dayOffReason")}: {request.dayOffReason}
                  </p>
                )}
                {request.note && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{request.note}</p>
                )}
                {request.rejectionReason && (
                  <p className="text-sm text-destructive mt-1">{t("rejectReason")}: {request.rejectionReason}</p>
                )}
                {canApprove && request.requestedBy && (
                  <p className="text-xs text-muted-foreground mt-1">By: {request.requestedBy}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canApprove && request.status === "pending" && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600"
                      onClick={() => onApprove?.(request.id)}
                      data-testid={`button-approve-${request.id}`}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onReject?.(request.id)}
                      data-testid={`button-reject-${request.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {canDelete && request.status === "pending" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete?.(request.id)}
                    data-testid={`button-delete-${request.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

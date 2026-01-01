import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, Users, FileText, Trash2, Settings, Terminal, 
  RefreshCw, Loader2, Lock, Key, UserCog, Table, Play,
  ChevronLeft
} from "lucide-react";
import { Link } from "wouter";

export default function DevToolboxPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [devCode, setDevCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  // System Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logLimit, setLogLimit] = useState(50);
  const [logFilter, setLogFilter] = useState("");
  
  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [clearUsername, setClearUsername] = useState("");
  
  // Config state
  const [config, setConfig] = useState<Record<string, string>>({});
  const [newConfigKey, setNewConfigKey] = useState("");
  const [newConfigValue, setNewConfigValue] = useState("");
  
  // User Management state
  const [targetUsername, setTargetUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newPosition, setNewPosition] = useState("");
  
  // Database state
  const [tables, setTables] = useState<{ name: string; count: number }[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [clearTableName, setClearTableName] = useState("");
  
  // Query executor state
  const [query, setQuery] = useState("SELECT * FROM users LIMIT 10");
  const [queryResult, setQueryResult] = useState<any[]>([]);

  const apiCall = async (endpoint: string, body: Record<string, any>) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, devCode, ...body })
    });
    return response.json();
  };

  const handleAuthenticate = async () => {
    setLoading({ auth: true });
    const result = await apiCall(api.devTools.getSystemLogs.path, { limit: 1 });
    if (result.ok) {
      setIsAuthenticated(true);
      toast({ title: "Developer Toolbox unlocked" });
    } else {
      toast({ title: "Access denied", description: result.message, variant: "destructive" });
    }
    setLoading({ auth: false });
  };

  // System Logs
  const fetchLogs = async () => {
    setLoading({ logs: true });
    const result = await apiCall(api.devTools.getSystemLogs.path, { limit: logLimit, action: logFilter || undefined });
    if (result.ok) setLogs(result.logs || []);
    else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ logs: false });
  };

  // Sessions
  const fetchSessions = async () => {
    setLoading({ sessions: true });
    const result = await apiCall(api.devTools.getSessions.path, {});
    if (result.ok) setSessions(result.sessions || []);
    else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ sessions: false });
  };

  const handleClearSessions = async () => {
    setLoading({ clearSessions: true });
    const result = await apiCall(api.devTools.clearSessions.path, { username: clearUsername || undefined });
    if (result.ok) {
      toast({ title: `Cleared ${result.count} sessions` });
      fetchSessions();
    } else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ clearSessions: false });
  };

  // Config
  const fetchConfig = async () => {
    setLoading({ config: true });
    const result = await apiCall(api.devTools.getConfig.path, {});
    if (result.ok) setConfig(result.config || {});
    else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ config: false });
  };

  const handleSetConfig = async () => {
    if (!newConfigKey) return;
    setLoading({ setConfig: true });
    const result = await apiCall(api.devTools.setConfig.path, { key: newConfigKey, value: newConfigValue });
    if (result.ok) {
      toast({ title: "Config updated" });
      fetchConfig();
      setNewConfigKey("");
      setNewConfigValue("");
    } else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ setConfig: false });
  };

  // User Management
  const handleResetPassword = async () => {
    if (!targetUsername || !newPassword) return;
    setLoading({ resetPassword: true });
    const result = await apiCall(api.devTools.resetPassword.path, { username: targetUsername, newPassword });
    if (result.ok) {
      toast({ title: result.message || "Password reset successful" });
      setNewPassword("");
    } else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ resetPassword: false });
  };

  const handleUpdateRole = async () => {
    if (!targetUsername) return;
    setLoading({ updateRole: true });
    const result = await apiCall(api.devTools.updateUserRole.path, { username: targetUsername, role: newRole, position: newPosition || undefined });
    if (result.ok) {
      toast({ title: result.message || "Role updated" });
    } else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ updateRole: false });
  };

  // Database Tools
  const fetchTables = async () => {
    setLoading({ tables: true });
    const result = await apiCall(api.devTools.getTableInfo.path, {});
    if (result.ok) setTables(result.tables || []);
    else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ tables: false });
  };

  const fetchTableRows = async (tableName: string) => {
    setLoading({ tableRows: true });
    setSelectedTable(tableName);
    const result = await apiCall(api.devTools.getTableInfo.path, { tableName });
    if (result.ok) setTableRows(result.rows || []);
    else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ tableRows: false });
  };

  const handleClearTable = async () => {
    if (!clearTableName) return;
    if (!confirm(`Are you sure you want to clear all data from "${clearTableName}"?`)) return;
    setLoading({ clearTable: true });
    const result = await apiCall(api.devTools.clearTestData.path, { tableName: clearTableName });
    if (result.ok) {
      toast({ title: result.message || `Cleared ${result.count} rows` });
      fetchTables();
      if (selectedTable === clearTableName) setTableRows([]);
    } else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ clearTable: false });
  };

  // Query Executor
  const handleExecuteQuery = async () => {
    if (!query.trim()) return;
    setLoading({ query: true });
    const result = await apiCall(api.devTools.executeQuery.path, { query });
    if (result.ok) {
      setQueryResult(result.result || []);
      toast({ title: `Query returned ${result.result?.length || 0} rows` });
    } else toast({ title: "Error", description: result.message, variant: "destructive" });
    setLoading({ query: false });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <CardTitle>Developer Toolbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Developer Code</Label>
              <Input
                type="password"
                placeholder="Enter developer code"
                value={devCode}
                onChange={(e) => setDevCode(e.target.value)}
                data-testid="input-dev-code"
              />
            </div>
            <div className="flex gap-2">
              <Link href="/settings" className="flex-1">
                <Button variant="outline" className="w-full" data-testid="button-back">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </Link>
              <Button 
                onClick={handleAuthenticate} 
                disabled={loading.auth || !devCode} 
                className="flex-1"
                data-testid="button-unlock"
              >
                {loading.auth && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Unlock
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="ghost" size="icon" data-testid="button-back-main">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Developer Toolbox</h1>
          </div>
          <Badge variant="secondary">Dev Mode</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-1">
            <TabsTrigger value="logs" className="text-xs" data-testid="tab-logs">
              <FileText className="h-4 w-4 mr-1" /> Logs
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs" data-testid="tab-sessions">
              <Key className="h-4 w-4 mr-1" /> Sessions
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs" data-testid="tab-config">
              <Settings className="h-4 w-4 mr-1" /> Config
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs" data-testid="tab-users">
              <UserCog className="h-4 w-4 mr-1" /> Users
            </TabsTrigger>
            <TabsTrigger value="database" className="text-xs" data-testid="tab-database">
              <Database className="h-4 w-4 mr-1" /> Database
            </TabsTrigger>
            <TabsTrigger value="query" className="text-xs" data-testid="tab-query">
              <Terminal className="h-4 w-4 mr-1" /> Query
            </TabsTrigger>
          </TabsList>

          {/* System Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" /> System Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Filter by action..."
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="flex-1 min-w-[150px]"
                    data-testid="input-log-filter"
                  />
                  <Select value={String(logLimit)} onValueChange={(v) => setLogLimit(Number(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchLogs} disabled={loading.logs} data-testid="button-fetch-logs">
                    {loading.logs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
                <ScrollArea className="h-[400px] border rounded-md">
                  <div className="p-2 space-y-1 text-xs font-mono">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2 p-1 hover:bg-muted rounded">
                        <span className="text-muted-foreground whitespace-nowrap">{log.ts?.substring(0, 19)}</span>
                        <Badge variant="outline" className="text-xs">{log.action}</Badge>
                        <span className="text-muted-foreground">{log.byUser}</span>
                        <span className="truncate">{log.detail}</span>
                      </div>
                    ))}
                    {logs.length === 0 && <div className="text-center text-muted-foreground py-8">No logs found. Click refresh to load.</div>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-5 w-5" /> Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={fetchSessions} disabled={loading.sessions} data-testid="button-fetch-sessions">
                    {loading.sessions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Refresh
                  </Button>
                  <Input
                    placeholder="Username (optional)"
                    value={clearUsername}
                    onChange={(e) => setClearUsername(e.target.value)}
                    className="w-40"
                    data-testid="input-clear-username"
                  />
                  <Button variant="destructive" onClick={handleClearSessions} disabled={loading.clearSessions} data-testid="button-clear-sessions">
                    {loading.clearSessions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-[300px] border rounded-md">
                  <div className="p-2 space-y-1 text-xs font-mono">
                    {sessions.map((s, i) => (
                      <div key={i} className="flex gap-2 p-1 hover:bg-muted rounded">
                        <Badge variant="outline">{s.username}</Badge>
                        <span className="text-muted-foreground truncate">{s.token?.substring(0, 20)}...</span>
                        <span className="text-muted-foreground">{s.expiresAt}</span>
                      </div>
                    ))}
                    {sessions.length === 0 && <div className="text-center text-muted-foreground py-8">No sessions. Click refresh to load.</div>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-5 w-5" /> System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={fetchConfig} disabled={loading.config} data-testid="button-fetch-config">
                  {loading.config ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Load Config
                </Button>
                <div className="space-y-2">
                  {Object.entries(config).map(([key, value]) => (
                    <div key={key} className="flex gap-2 items-center p-2 bg-muted rounded-md">
                      <Badge variant="secondary">{key}</Badge>
                      <span className="text-sm font-mono flex-1">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-sm">Add/Update Config</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      placeholder="Key"
                      value={newConfigKey}
                      onChange={(e) => setNewConfigKey(e.target.value)}
                      className="w-40"
                      data-testid="input-config-key"
                    />
                    <Input
                      placeholder="Value"
                      value={newConfigValue}
                      onChange={(e) => setNewConfigValue(e.target.value)}
                      className="flex-1 min-w-[150px]"
                      data-testid="input-config-value"
                    />
                    <Button onClick={handleSetConfig} disabled={loading.setConfig || !newConfigKey} data-testid="button-set-config">
                      {loading.setConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="h-5 w-5" /> User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Target Username</Label>
                  <Input
                    placeholder="Enter username"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    data-testid="input-target-username"
                  />
                </div>
                
                <div className="border rounded-md p-4 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" /> Reset Password
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 min-w-[150px]"
                      data-testid="input-new-password"
                    />
                    <Button onClick={handleResetPassword} disabled={loading.resetPassword || !targetUsername || !newPassword} data-testid="button-reset-password">
                      {loading.resetPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset"}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md p-4 space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> Update Role/Position
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="w-32" data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="store_manager">Store Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Position (optional)"
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value)}
                      className="flex-1 min-w-[150px]"
                      data-testid="input-position"
                    />
                    <Button onClick={handleUpdateRole} disabled={loading.updateRole || !targetUsername} data-testid="button-update-role">
                      {loading.updateRole ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-5 w-5" /> Database Tables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={fetchTables} disabled={loading.tables} data-testid="button-fetch-tables">
                  {loading.tables ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Load Tables
                </Button>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {tables.map((t) => (
                    <Button
                      key={t.name}
                      variant={selectedTable === t.name ? "default" : "outline"}
                      className="justify-between"
                      onClick={() => fetchTableRows(t.name)}
                      data-testid={`button-table-${t.name}`}
                    >
                      <span className="truncate">{t.name}</span>
                      <Badge variant="secondary" className="ml-1">{t.count}</Badge>
                    </Button>
                  ))}
                </div>
                
                {selectedTable && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Table className="h-4 w-4" /> {selectedTable}
                      </h4>
                      <Badge>{tableRows.length} rows</Badge>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-md">
                      <div className="p-2 text-xs font-mono">
                        {tableRows.map((row, i) => (
                          <div key={i} className="p-1 hover:bg-muted rounded border-b last:border-0">
                            {JSON.stringify(row, null, 0)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-sm text-destructive flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Clear Table Data
                  </h4>
                  <div className="flex gap-2">
                    <Select value={clearTableName} onValueChange={setClearTableName}>
                      <SelectTrigger className="w-48" data-testid="select-clear-table">
                        <SelectValue placeholder="Select table..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shifts">shifts</SelectItem>
                        <SelectItem value="systemlog">systemlog</SelectItem>
                        <SelectItem value="sessions">sessions</SelectItem>
                        <SelectItem value="swap_requests">swap_requests</SelectItem>
                        <SelectItem value="daily_sales_reports">daily_sales_reports</SelectItem>
                        <SelectItem value="manager_requests">manager_requests</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="destructive" onClick={handleClearTable} disabled={loading.clearTable || !clearTableName} data-testid="button-clear-table">
                      {loading.clearTable ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Query Executor Tab */}
          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-5 w-5" /> SQL Query Executor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>SELECT Query (read-only)</Label>
                    <Badge variant="secondary">Only SELECT allowed</Badge>
                  </div>
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="font-mono text-sm min-h-[100px]"
                    placeholder="SELECT * FROM users LIMIT 10"
                    data-testid="textarea-query"
                  />
                  <Button onClick={handleExecuteQuery} disabled={loading.query} data-testid="button-execute-query">
                    {loading.query ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    Execute
                  </Button>
                </div>
                {queryResult.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Results</Label>
                      <Badge>{queryResult.length} rows</Badge>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-md">
                      <div className="p-2 text-xs font-mono">
                        {queryResult.map((row, i) => (
                          <div key={i} className="p-1 hover:bg-muted rounded border-b last:border-0">
                            {JSON.stringify(row, null, 0)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
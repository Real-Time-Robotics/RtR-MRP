// src/app/(dashboard)/compliance/page.tsx
"use client";

import { useState } from "react";
import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import {
  Shield,
  FileCheck,
  Key,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  RefreshCw,
  Download,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data for demonstration
const complianceMetrics = {
  overallScore: 94,
  signatureCompliance: 100,
  auditIntegrity: 100,
  mfaAdoption: 85,
  passwordCompliance: 92,
  itarCompliance: 100,
  sessionSecurity: 88,
};

const recentSignatures = [
  {
    id: "1",
    entity: "NCR-2024-0042",
    action: "APPROVE",
    user: "John Smith",
    timestamp: "2024-01-15T10:30:00Z",
    verified: true,
  },
  {
    id: "2",
    entity: "WO-2024-0156",
    action: "RELEASE",
    user: "Jane Doe",
    timestamp: "2024-01-15T09:45:00Z",
    verified: true,
  },
  {
    id: "3",
    entity: "CAPA-2024-0012",
    action: "REVIEW",
    user: "Mike Johnson",
    timestamp: "2024-01-15T08:20:00Z",
    verified: true,
  },
  {
    id: "4",
    entity: "INS-2024-0089",
    action: "COMPLETE",
    user: "Sarah Wilson",
    timestamp: "2024-01-14T16:30:00Z",
    verified: true,
  },
];

const securityEvents = [
  {
    id: "1",
    type: "LOGIN_FAILED",
    user: "unknown@example.com",
    ip: "192.168.1.100",
    timestamp: "2024-01-15T11:00:00Z",
    severity: "warning",
  },
  {
    id: "2",
    type: "MFA_ENABLED",
    user: "john.smith@company.com",
    ip: "10.0.0.50",
    timestamp: "2024-01-15T10:45:00Z",
    severity: "info",
  },
  {
    id: "3",
    type: "PASSWORD_CHANGE",
    user: "jane.doe@company.com",
    ip: "10.0.0.51",
    timestamp: "2024-01-15T09:30:00Z",
    severity: "info",
  },
  {
    id: "4",
    type: "ACCESS_DENIED",
    user: "guest@company.com",
    ip: "192.168.1.101",
    timestamp: "2024-01-14T15:20:00Z",
    severity: "warning",
  },
];

const itarItems = [
  {
    id: "1",
    entityType: "Part",
    entityId: "RTR-MIL-2024",
    usmlCategory: "XI",
    status: "active",
    accessCount: 12,
  },
  {
    id: "2",
    entityType: "Product",
    entityId: "AV-SYS-500",
    usmlCategory: "VIII",
    status: "active",
    accessCount: 8,
  },
  {
    id: "3",
    entityType: "Document",
    entityId: "DOC-SPEC-2024-001",
    usmlCategory: "XII",
    status: "active",
    accessCount: 25,
  },
];

function MetricCard({
  title,
  value,
  icon: Icon,
  status,
  description,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  status: "success" | "warning" | "danger";
  description: string;
}) {
  const statusColors = {
    success: "text-green-500",
    warning: "text-yellow-500",
    danger: "text-red-500",
  };

  const statusBg = {
    success: "bg-green-500/10",
    warning: "bg-yellow-500/10",
    danger: "bg-red-500/10",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${statusBg[status]}`}>
          <Icon className={`h-4 w-4 ${statusColors[status]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{value}%</span>
          {status === "success" && (
            <CheckCircle2 className="mb-1 h-4 w-4 text-success-500" />
          )}
          {status === "warning" && (
            <AlertTriangle className="mb-1 h-4 w-4 text-warning-500" />
          )}
        </div>
        <Progress value={value} className="mt-2" />
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor regulatory compliance and security posture
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Compliance Score */}
      <Card className="border-2 border-success-500/20 bg-success-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success-500/20 p-3">
                <Shield className="h-6 w-6 text-success-500" />
              </div>
              <div>
                <CardTitle>Overall Compliance Score</CardTitle>
                <CardDescription>Based on all compliance metrics</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-success-500">
                {complianceMetrics.overallScore}%
              </span>
              <Badge variant="outline" className="ml-2 border-success-500 text-success-500">
                Excellent
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Compliance Metrics - compact inline */}
      <CompactStatsBar stats={[
        { label: 'E-Signatures', value: `${complianceMetrics.signatureCompliance}%`, color: 'text-success-600' },
        { label: 'Audit Trail', value: `${complianceMetrics.auditIntegrity}%`, color: 'text-success-600' },
        { label: 'MFA Adoption', value: `${complianceMetrics.mfaAdoption}%`, color: 'text-warning-600' },
        { label: 'Password', value: `${complianceMetrics.passwordCompliance}%`, color: 'text-success-600' },
        { label: 'ITAR', value: `${complianceMetrics.itarCompliance}%`, color: 'text-success-600' },
        { label: 'Session Security', value: `${complianceMetrics.sessionSecurity}%`, color: 'text-warning-600' },
      ]} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signatures">Electronic Signatures</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="itar">ITAR Controls</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Signatures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Recent Electronic Signatures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Signed By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSignatures.map((sig) => (
                      <TableRow key={sig.id}>
                        <TableCell className="font-medium">{sig.entity}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sig.action}</Badge>
                        </TableCell>
                        <TableCell>{sig.user}</TableCell>
                        <TableCell>
                          {sig.verified ? (
                            <CheckCircle2 className="h-4 w-4 text-success-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-warning-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Security Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {event.user}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{event.ip}</TableCell>
                        <TableCell>
                          <Badge
                            variant={event.severity === "warning" ? "destructive" : "secondary"}
                          >
                            {event.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Electronic Signature Management</CardTitle>
              <CardDescription>
                21 CFR Part 11 compliant electronic signature tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-sm text-muted-foreground">Total Signatures</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold text-success-500">156</div>
                  <div className="text-sm text-muted-foreground">Verified Valid</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-sm text-muted-foreground">Pending Signatures</div>
                </div>
              </div>
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Signed By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Chain Valid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSignatures.map((sig) => (
                      <TableRow key={sig.id}>
                        <TableCell className="font-medium">{sig.entity}</TableCell>
                        <TableCell>{sig.entity.split("-")[0]}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sig.action}</Badge>
                        </TableCell>
                        <TableCell>{sig.user}</TableCell>
                        <TableCell>
                          {new Date(sig.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <CheckCircle2 className="h-4 w-4 text-success-500" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail Integrity</CardTitle>
              <CardDescription>
                Tamper-proof audit logging with chain hash verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg border border-success-500/50 bg-success-500/10 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-success-500" />
                  <div>
                    <div className="font-medium text-success-500">
                      Audit Trail Integrity Verified
                    </div>
                    <div className="text-sm text-muted-foreground" suppressHydrationWarning>
                      Last verified: {new Date().toLocaleString()} | 15,234 entries checked
                    </div>
                  </div>
                  <Button variant="outline" className="ml-auto" size="sm">
                    Run Verification
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">15,234</div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">892</div>
                  <div className="text-sm text-muted-foreground">Today</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">45</div>
                  <div className="text-sm text-muted-foreground">Security Events</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">127</div>
                  <div className="text-sm text-muted-foreground">Compliance Events</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ITAR Controlled Items</CardTitle>
              <CardDescription>
                Export control compliance for defense-related items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">{itarItems.length}</div>
                  <div className="text-sm text-muted-foreground">Controlled Items</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">8</div>
                  <div className="text-sm text-muted-foreground">Certified Users</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold text-success-500">0</div>
                  <div className="text-sm text-muted-foreground">Access Denials (24h)</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">2</div>
                  <div className="text-sm text-muted-foreground">Pending Reviews</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Type</TableHead>
                    <TableHead>Item ID</TableHead>
                    <TableHead>USML Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itarItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.entityType}</TableCell>
                      <TableCell className="font-mono">{item.entityId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Cat. {item.usmlCategory}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "active" ? "default" : "secondary"}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.accessCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Event Log</CardTitle>
              <CardDescription>
                Real-time security monitoring and threat detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">1,234</div>
                  <div className="text-sm text-muted-foreground">Total Events (7d)</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold text-warning-500">23</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold text-danger-500">2</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-2xl font-bold">42</div>
                  <div className="text-sm text-muted-foreground">Active Sessions</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        {event.type.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {event.user}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{event.ip}</TableCell>
                      <TableCell>
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.severity === "warning"
                              ? "destructive"
                              : event.severity === "info"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {event.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

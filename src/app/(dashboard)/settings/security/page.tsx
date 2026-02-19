// src/app/(dashboard)/settings/security/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Key,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Laptop,
  Monitor,
  LogOut,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "sonner";

interface Session {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
  token?: string;
}

export default function SecuritySettingsPage() {
  const [activeTab, setActiveTab] = useState("mfa");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaStep, setMfaStep] = useState(1);
  const [mfaDeviceId, setMfaDeviceId] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaQrUrl, setMfaQrUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Fetch active sessions from API
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/compliance/sessions');
      if (!res.ok) throw new Error('Không thể tải phiên đăng nhập');
      const data = await res.json();
      const rawSessions = data.sessions || [];
      const mapped: Session[] = rawSessions.map((s: { id?: string; sessionToken?: string; device?: string; userAgent?: string; location?: string; ipAddress?: string; ip?: string; lastActive?: string; lastAccessedAt?: string; updatedAt?: string; current?: boolean; isCurrent?: boolean }) => ({
        id: s.id || s.sessionToken || '',
        device: s.device || s.userAgent || 'Unknown device',
        location: s.location || '',
        ip: s.ipAddress || s.ip || '',
        lastActive: s.lastActive || (s.lastAccessedAt ? new Date(s.lastAccessedAt).toLocaleString('vi-VN') : s.updatedAt ? new Date(s.updatedAt).toLocaleString('vi-VN') : ''),
        current: s.current || s.isCurrent || false,
        token: s.sessionToken,
      }));
      setSessions(mapped);
    } catch (err) {
      toast.error('Lỗi tải danh sách phiên đăng nhập');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionToken: string) => {
    try {
      const res = await fetch(`/api/compliance/sessions?token=${encodeURIComponent(sessionToken)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Không thể thu hồi phiên');
      toast.success('Đã thu hồi phiên đăng nhập');
      fetchSessions();
    } catch (err) {
      toast.error('Lỗi khi thu hồi phiên đăng nhập');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      const res = await fetch('/api/compliance/sessions?all=true', {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Không thể thu hồi tất cả phiên');
      toast.success('Đã thu hồi tất cả phiên đăng nhập khác');
      fetchSessions();
    } catch (err) {
      toast.error('Lỗi khi thu hồi phiên đăng nhập');
    }
  };

  const handleMfaSetup = async () => {
    setShowMfaSetup(true);
    setMfaStep(1);
    try {
      const res = await fetch('/api/compliance/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      if (!res.ok) throw new Error('Không thể khởi tạo MFA');
      const data = await res.json();
      setMfaDeviceId(data.deviceId || '');
      setMfaSecret(data.secret || '');
      setMfaQrUrl(data.qrCodeUrl || '');
      if (data.backupCodes) setBackupCodes(data.backupCodes);
    } catch (err) {
      toast.error('Lỗi khởi tạo xác thực 2 yếu tố');
      setShowMfaSetup(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (verificationCode.length !== 6) return;
    try {
      const res = await fetch('/api/compliance/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          code: verificationCode,
          deviceId: mfaDeviceId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Mã xác thực không hợp lệ');
      }
      setMfaStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xác thực MFA');
    }
  };

  const handleCompleteMfaSetup = () => {
    setMfaEnabled(true);
    setShowMfaSetup(false);
    setMfaStep(1);
    setVerificationCode("");
    toast.success('Xác thực 2 yếu tố đã được kích hoạt');
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[!@#$%^&*]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security, authentication, and active sessions
        </p>
      </div>

      {/* Security Score */}
      <Card className="border-2 border-yellow-500/20 bg-yellow-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-500/20 p-3">
                <Shield className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <CardTitle>Security Score</CardTitle>
                <CardDescription>Your account security level</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-yellow-500">75%</span>
              <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-500">
                Good
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={75} className="h-2" />
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Strong password
              </span>
              {mfaEnabled ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  MFA enabled
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Enable MFA for better security
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mfa">Multi-Factor Auth</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>

        {/* MFA Tab */}
        <TabsContent value="mfa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with 2FA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-medium">Authenticator App</div>
                    <div className="text-sm text-muted-foreground">
                      Use an app like Google Authenticator or Authy
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {mfaEnabled && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  )}
                  <Switch
                    checked={mfaEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleMfaSetup();
                      } else {
                        setMfaEnabled(false);
                      }
                    }}
                  />
                </div>
              </div>

              {mfaEnabled && (
                <>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Two-factor authentication is enabled</AlertTitle>
                    <AlertDescription>
                      Your account is protected with an authenticator app.
                      You will need your phone to sign in.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Backup Codes</div>
                        <div className="text-sm text-muted-foreground">
                          Use these if you lose access to your authenticator
                        </div>
                      </div>
                      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
                        <DialogTrigger asChild>
                          <Button variant="outline">View Backup Codes</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Backup Codes</DialogTitle>
                            <DialogDescription>
                              Save these codes in a secure location. Each code can only be used once.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
                            {backupCodes.map((code, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span>{code}</span>
                              </div>
                            ))}
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(backupCodes.join("\n"));
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy All
                            </Button>
                            <Button onClick={() => setShowBackupCodes(false)}>Done</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Regenerate Codes</div>
                        <div className="text-sm text-muted-foreground">
                          Generate new backup codes (invalidates old ones)
                        </div>
                      </div>
                      <Button variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* MFA Setup Dialog */}
          <Dialog open={showMfaSetup} onOpenChange={setShowMfaSetup}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  {mfaStep === 1 && "Scan the QR code with your authenticator app"}
                  {mfaStep === 2 && "Enter the verification code from your app"}
                  {mfaStep === 3 && "Save your backup codes"}
                </DialogDescription>
              </DialogHeader>

              {mfaStep === 1 && (
                <div className="space-y-4">
                  <div className="flex justify-center rounded-lg bg-white p-4">
                    {mfaQrUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mfaQrUrl} alt="QR Code" className="h-48 w-48 rounded-lg" />
                    ) : (
                      <div className="h-48 w-48 rounded-lg bg-muted flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Cannot scan? Enter this code manually:
                    </p>
                    <code className="mt-2 block rounded bg-muted px-4 py-2 font-mono text-sm">
                      {mfaSecret || 'Loading...'}
                    </code>
                  </div>
                  <Button className="w-full" onClick={() => setMfaStep(2)} disabled={!mfaSecret}>
                    Continue
                  </Button>
                </div>
              )}

              {mfaStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Verification Code</Label>
                    <Input
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center font-mono text-2xl tracking-widest"
                      maxLength={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleVerifyMfa}
                    disabled={verificationCode.length !== 6}
                  >
                    Verify
                  </Button>
                </div>
              )}

              {mfaStep === 3 && (
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Save your backup codes</AlertTitle>
                    <AlertDescription>
                      Store these codes safely. You will need them if you lose access to your authenticator.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">
                    {backupCodes.slice(0, 10).map((code, i) => (
                      <div key={i}>{code}</div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigator.clipboard.writeText(backupCodes.join("\n"))}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button className="flex-1" onClick={handleCompleteMfaSetup}>
                      I Have Saved Them
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password regularly to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      calculatePasswordStrength(e.target.value);
                    }}
                    placeholder="Enter new password"
                  />
                  {newPassword && (
                    <div className="space-y-2">
                      <Progress value={passwordStrength} className="h-2" />
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className={newPassword.length >= 12 ? "text-green-500" : ""}>
                          12+ chars
                        </span>
                        <span className={/[A-Z]/.test(newPassword) ? "text-green-500" : ""}>
                          Uppercase
                        </span>
                        <span className={/[0-9]/.test(newPassword) ? "text-green-500" : ""}>
                          Number
                        </span>
                        <span className={/[!@#$%^&*]/.test(newPassword) ? "text-green-500" : ""}>
                          Special char
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                </div>

                <Button
                  disabled={
                    !currentPassword ||
                    !newPassword ||
                    newPassword !== confirmPassword ||
                    passwordStrength < 75
                  }
                >
                  Update Password
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium">Password Requirements</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>At least 12 characters long</li>
                  <li>Contains at least one uppercase letter</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character (!@#$%^&*)</li>
                  <li>Cannot be a previously used password</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>
                    Manage devices where you are currently signed in
                  </CardDescription>
                </div>
                <Button variant="outline" className="text-destructive" onClick={handleRevokeAllSessions}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active sessions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {session.device.includes("iPhone") || session.device.includes("Mobile") ? (
                              <Smartphone className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Laptop className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <div className="font-medium">{session.device}</div>
                              {session.current && (
                                <Badge variant="outline" className="text-xs">
                                  Current session
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{session.location}</TableCell>
                        <TableCell className="font-mono text-sm">{session.ip}</TableCell>
                        <TableCell>
                          <Badge variant={session.current ? "default" : "secondary"}>
                            {session.lastActive}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!session.current && session.token && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleRevokeSession(session.token!)}
                            >
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

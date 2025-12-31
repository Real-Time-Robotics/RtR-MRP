'use client';

import React, { useState } from 'react';
import {
  Settings,
  User,
  Building,
  Bell,
  Shield,
  Database,
  Globe,
  Palette,
  Mail,
  Key,
  Users,
  Workflow,
  FileText,
  Printer,
  HardDrive,
  Cloud,
  Lock,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  Save,
  RefreshCw,
  AlertTriangle,
  Info,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// =============================================================================
// SETTINGS PAGE - REDESIGNED
// Modern settings interface with organized sections
// =============================================================================

// Settings sections
const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'company', label: 'Company', icon: Building },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'localization', label: 'Localization', icon: Globe },
  { id: 'integrations', label: 'Integrations', icon: Workflow },
  { id: 'data', label: 'Data & Backup', icon: Database },
];

// Toggle Switch Component
const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
      checked ? 'bg-primary-600' : 'bg-slate-200',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
    disabled={disabled}
  >
    <span
      className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
        checked ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

// Setting Row Component
const SettingRow: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}> = ({ title, description, children, danger }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
    <div className="flex-1 pr-4">
      <p className={cn('text-sm font-medium', danger ? 'text-danger-600' : 'text-slate-900')}>
        {title}
      </p>
      {description && (
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// Section Card Component
const SectionCard: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, children, icon }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        {icon && <div className="text-slate-400">{icon}</div>}
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
    <div className="px-6 py-2">{children}</div>
  </div>
);

// Input Field Component
const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, disabled }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
    />
  </div>
);

// Select Field Component
const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Profile Section
const ProfileSection: React.FC = () => {
  const [profile, setProfile] = useState({
    firstName: 'Nguyen',
    lastName: 'Van Admin',
    email: 'admin@rtr.vn',
    phone: '+84 28 1234 5678',
    title: 'System Administrator',
    department: 'IT',
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Personal Information" icon={<User className="h-5 w-5" />}>
        <div className="py-4">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold">
              NV
            </div>
            <div>
              <button className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100">
                Change Photo
              </button>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG. Max 2MB</p>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="First Name"
              value={profile.firstName}
              onChange={(v) => setProfile({ ...profile, firstName: v })}
            />
            <InputField
              label="Last Name"
              value={profile.lastName}
              onChange={(v) => setProfile({ ...profile, lastName: v })}
            />
            <InputField
              label="Email"
              value={profile.email}
              onChange={(v) => setProfile({ ...profile, email: v })}
              type="email"
            />
            <InputField
              label="Phone"
              value={profile.phone}
              onChange={(v) => setProfile({ ...profile, phone: v })}
            />
            <InputField
              label="Job Title"
              value={profile.title}
              onChange={(v) => setProfile({ ...profile, title: v })}
            />
            <InputField
              label="Department"
              value={profile.department}
              onChange={(v) => setProfile({ ...profile, department: v })}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Password" icon={<Key className="h-5 w-5" />}>
        <div className="py-4 space-y-4">
          <InputField label="Current Password" value="" onChange={() => {}} type="password" />
          <InputField label="New Password" value="" onChange={() => {}} type="password" />
          <InputField label="Confirm Password" value="" onChange={() => {}} type="password" />
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
            Update Password
          </button>
        </div>
      </SectionCard>
    </div>
  );
};

// Company Section
const CompanySection: React.FC = () => {
  const [company, setCompany] = useState({
    name: 'RTR Vietnam Co., Ltd',
    legalName: 'RTR Vietnam Company Limited',
    taxId: '0123456789',
    address: '123 Nguyen Hue, District 1',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    phone: '+84 28 1234 5678',
    email: 'info@rtr.vn',
    website: 'https://rtr.vn',
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Company Information" icon={<Building className="h-5 w-5" />}>
        <div className="py-4 grid grid-cols-2 gap-4">
          <InputField
            label="Company Name"
            value={company.name}
            onChange={(v) => setCompany({ ...company, name: v })}
          />
          <InputField
            label="Legal Name"
            value={company.legalName}
            onChange={(v) => setCompany({ ...company, legalName: v })}
          />
          <InputField
            label="Tax ID"
            value={company.taxId}
            onChange={(v) => setCompany({ ...company, taxId: v })}
          />
          <InputField
            label="Phone"
            value={company.phone}
            onChange={(v) => setCompany({ ...company, phone: v })}
          />
          <div className="col-span-2">
            <InputField
              label="Address"
              value={company.address}
              onChange={(v) => setCompany({ ...company, address: v })}
            />
          </div>
          <InputField
            label="City"
            value={company.city}
            onChange={(v) => setCompany({ ...company, city: v })}
          />
          <SelectField
            label="Country"
            value={company.country}
            onChange={(v) => setCompany({ ...company, country: v })}
            options={[
              { value: 'Vietnam', label: 'Vietnam' },
              { value: 'USA', label: 'United States' },
              { value: 'Singapore', label: 'Singapore' },
            ]}
          />
          <InputField
            label="Email"
            value={company.email}
            onChange={(v) => setCompany({ ...company, email: v })}
            type="email"
          />
          <InputField
            label="Website"
            value={company.website}
            onChange={(v) => setCompany({ ...company, website: v })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Logo & Branding" icon={<Palette className="h-5 w-5" />}>
        <div className="py-4">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
              <span className="text-slate-400 text-sm">Company Logo</span>
            </div>
            <div>
              <button className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100">
                Upload Logo
              </button>
              <p className="text-xs text-slate-500 mt-2">PNG, SVG. Recommended 512x512px</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

// Notifications Section
const NotificationsSection: React.FC = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    lowStock: true,
    orderUpdates: true,
    qualityAlerts: true,
    systemUpdates: false,
    weeklyReport: true,
    monthlyReport: true,
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Notification Channels" icon={<Bell className="h-5 w-5" />}>
        <SettingRow
          title="Email Notifications"
          description="Receive notifications via email"
        >
          <Toggle
            checked={notifications.email}
            onChange={(v) => setNotifications({ ...notifications, email: v })}
          />
        </SettingRow>
        <SettingRow
          title="Push Notifications"
          description="Receive browser push notifications"
        >
          <Toggle
            checked={notifications.push}
            onChange={(v) => setNotifications({ ...notifications, push: v })}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Alert Types" icon={<AlertTriangle className="h-5 w-5" />}>
        <SettingRow
          title="Low Stock Alerts"
          description="Get notified when inventory falls below minimum levels"
        >
          <Toggle
            checked={notifications.lowStock}
            onChange={(v) => setNotifications({ ...notifications, lowStock: v })}
          />
        </SettingRow>
        <SettingRow
          title="Order Updates"
          description="Notifications for order status changes"
        >
          <Toggle
            checked={notifications.orderUpdates}
            onChange={(v) => setNotifications({ ...notifications, orderUpdates: v })}
          />
        </SettingRow>
        <SettingRow
          title="Quality Alerts"
          description="NCR and quality issue notifications"
        >
          <Toggle
            checked={notifications.qualityAlerts}
            onChange={(v) => setNotifications({ ...notifications, qualityAlerts: v })}
          />
        </SettingRow>
        <SettingRow
          title="System Updates"
          description="Maintenance and system update notices"
        >
          <Toggle
            checked={notifications.systemUpdates}
            onChange={(v) => setNotifications({ ...notifications, systemUpdates: v })}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Reports" icon={<FileText className="h-5 w-5" />}>
        <SettingRow
          title="Weekly Summary"
          description="Receive weekly performance summary every Monday"
        >
          <Toggle
            checked={notifications.weeklyReport}
            onChange={(v) => setNotifications({ ...notifications, weeklyReport: v })}
          />
        </SettingRow>
        <SettingRow
          title="Monthly Report"
          description="Detailed monthly analytics report"
        >
          <Toggle
            checked={notifications.monthlyReport}
            onChange={(v) => setNotifications({ ...notifications, monthlyReport: v })}
          />
        </SettingRow>
      </SectionCard>
    </div>
  );
};

// Security Section
const SecuritySection: React.FC = () => {
  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: '30',
    ipRestriction: false,
    auditLog: true,
  });

  const sessions = [
    { device: 'Chrome on MacOS', location: 'Ho Chi Minh City, VN', lastActive: 'Now', current: true },
    { device: 'Safari on iPhone', location: 'Ho Chi Minh City, VN', lastActive: '2 hours ago', current: false },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Two-Factor Authentication" icon={<Shield className="h-5 w-5" />}>
        <SettingRow
          title="Enable 2FA"
          description="Add an extra layer of security to your account"
        >
          <Toggle
            checked={security.twoFactor}
            onChange={(v) => setSecurity({ ...security, twoFactor: v })}
          />
        </SettingRow>
        {security.twoFactor && (
          <div className="py-4">
            <button className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100">
              Configure 2FA
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Session Settings" icon={<Lock className="h-5 w-5" />}>
        <div className="py-4">
          <SelectField
            label="Session Timeout"
            value={security.sessionTimeout}
            onChange={(v) => setSecurity({ ...security, sessionTimeout: v })}
            options={[
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
              { value: '60', label: '1 hour' },
              { value: '120', label: '2 hours' },
              { value: '0', label: 'Never' },
            ]}
          />
        </div>
        <SettingRow
          title="IP Restriction"
          description="Limit access to specific IP addresses"
        >
          <Toggle
            checked={security.ipRestriction}
            onChange={(v) => setSecurity({ ...security, ipRestriction: v })}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Active Sessions" icon={<Monitor className="h-5 w-5" />}>
        <div className="py-4 space-y-3">
          {sessions.map((session, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {session.device}
                  {session.current && (
                    <span className="ml-2 px-2 py-0.5 bg-success-100 text-success-700 text-xs rounded-full">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{session.location} • {session.lastActive}</p>
              </div>
              {!session.current && (
                <button className="text-sm text-danger-600 hover:text-danger-700">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Audit Log" icon={<FileText className="h-5 w-5" />}>
        <SettingRow
          title="Enable Audit Logging"
          description="Track all user actions for compliance"
        >
          <Toggle
            checked={security.auditLog}
            onChange={(v) => setSecurity({ ...security, auditLog: v })}
          />
        </SettingRow>
        <div className="py-4">
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
            View Audit Log
          </button>
        </div>
      </SectionCard>
    </div>
  );
};

// Appearance Section
const AppearanceSection: React.FC = () => {
  const [appearance, setAppearance] = useState({
    theme: 'light',
    density: 'comfortable',
    sidebarCollapsed: false,
    animationsEnabled: true,
  });

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Theme" icon={<Palette className="h-5 w-5" />}>
        <div className="py-4">
          <div className="grid grid-cols-3 gap-3">
            {themes.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.value}
                  onClick={() => setAppearance({ ...appearance, theme: theme.value })}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    appearance.theme === theme.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <Icon className={cn(
                    'h-6 w-6',
                    appearance.theme === theme.value ? 'text-primary-600' : 'text-slate-400'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    appearance.theme === theme.value ? 'text-primary-600' : 'text-slate-600'
                  )}>
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Display" icon={<Monitor className="h-5 w-5" />}>
        <div className="py-4">
          <SelectField
            label="Density"
            value={appearance.density}
            onChange={(v) => setAppearance({ ...appearance, density: v })}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'spacious', label: 'Spacious' },
            ]}
          />
        </div>
        <SettingRow
          title="Sidebar Collapsed by Default"
          description="Start with the sidebar minimized"
        >
          <Toggle
            checked={appearance.sidebarCollapsed}
            onChange={(v) => setAppearance({ ...appearance, sidebarCollapsed: v })}
          />
        </SettingRow>
        <SettingRow
          title="Enable Animations"
          description="Show smooth transitions and animations"
        >
          <Toggle
            checked={appearance.animationsEnabled}
            onChange={(v) => setAppearance({ ...appearance, animationsEnabled: v })}
          />
        </SettingRow>
      </SectionCard>
    </div>
  );
};

// Localization Section
const LocalizationSection: React.FC = () => {
  const [localization, setLocalization] = useState({
    language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'USD',
    numberFormat: 'en-US',
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Language & Region" icon={<Globe className="h-5 w-5" />}>
        <div className="py-4 grid grid-cols-2 gap-4">
          <SelectField
            label="Language"
            value={localization.language}
            onChange={(v) => setLocalization({ ...localization, language: v })}
            options={[
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'en', label: 'English' },
            ]}
          />
          <SelectField
            label="Timezone"
            value={localization.timezone}
            onChange={(v) => setLocalization({ ...localization, timezone: v })}
            options={[
              { value: 'Asia/Ho_Chi_Minh', label: '(GMT+7) Ho Chi Minh' },
              { value: 'Asia/Singapore', label: '(GMT+8) Singapore' },
              { value: 'America/New_York', label: '(GMT-5) New York' },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Formats" icon={<FileText className="h-5 w-5" />}>
        <div className="py-4 grid grid-cols-2 gap-4">
          <SelectField
            label="Date Format"
            value={localization.dateFormat}
            onChange={(v) => setLocalization({ ...localization, dateFormat: v })}
            options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
          />
          <SelectField
            label="Time Format"
            value={localization.timeFormat}
            onChange={(v) => setLocalization({ ...localization, timeFormat: v })}
            options={[
              { value: '24h', label: '24-hour (14:30)' },
              { value: '12h', label: '12-hour (2:30 PM)' },
            ]}
          />
          <SelectField
            label="Currency"
            value={localization.currency}
            onChange={(v) => setLocalization({ ...localization, currency: v })}
            options={[
              { value: 'USD', label: 'USD ($)' },
              { value: 'VND', label: 'VND (₫)' },
              { value: 'EUR', label: 'EUR (€)' },
            ]}
          />
          <SelectField
            label="Number Format"
            value={localization.numberFormat}
            onChange={(v) => setLocalization({ ...localization, numberFormat: v })}
            options={[
              { value: 'en-US', label: '1,234.56' },
              { value: 'de-DE', label: '1.234,56' },
              { value: 'vi-VN', label: '1.234,56' },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
};

// Data Section
const DataSection: React.FC = () => {
  const [autoBackup, setAutoBackup] = useState(true);

  return (
    <div className="space-y-6">
      <SectionCard title="Backup" icon={<Cloud className="h-5 w-5" />}>
        <SettingRow
          title="Automatic Backups"
          description="Daily automatic backup at 2:00 AM"
        >
          <Toggle checked={autoBackup} onChange={setAutoBackup} />
        </SettingRow>
        <div className="py-4 flex gap-3">
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
            Backup Now
          </button>
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
            Restore Backup
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Data Export" icon={<HardDrive className="h-5 w-5" />}>
        <div className="py-4 space-y-3">
          <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
            <span className="text-slate-900">Export All Data</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
            <span className="text-slate-900">Export Parts Master</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
            <span className="text-slate-900">Export Transactions</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Danger Zone" icon={<AlertTriangle className="h-5 w-5" />}>
        <SettingRow
          title="Clear All Data"
          description="Permanently delete all data. This action cannot be undone."
          danger
        >
          <button className="px-4 py-2 text-sm font-medium text-danger-600 border border-danger-300 rounded-lg hover:bg-danger-50">
            Clear Data
          </button>
        </SettingRow>
      </SectionCard>
    </div>
  );
};

// Main Settings Page
const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('profile');

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSection />;
      case 'company': return <CompanySection />;
      case 'notifications': return <NotificationsSection />;
      case 'security': return <SecuritySection />;
      case 'appearance': return <AppearanceSection />;
      case 'localization': return <LocalizationSection />;
      case 'data': return <DataSection />;
      default: return <ProfileSection />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account and application preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      activeSection === section.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">{renderSection()}</div>
        </div>
      </div>

      {/* Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-end gap-3">
          <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

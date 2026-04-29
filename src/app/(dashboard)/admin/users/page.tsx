// /dashboard/admin/users — User management + role assignment (TIP-S285-04)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UserWithRoles {
  id: string;
  name: string | null;
  email: string;
  status: string;
  roles: string[];
  roleNames: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

const ALL_ROLES = ['engineer', 'warehouse', 'production', 'procurement', 'admin', 'viewer'];
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  engineer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  warehouse: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  production: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  procurement: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleRole(userId: string, roleCode: string, hasRole: boolean) {
    setToggling(`${userId}-${roleCode}`);
    try {
      if (hasRole) {
        const res = await fetch(`/api/users/${userId}/roles`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleCode }),
        });
        if (res.ok) {
          toast.success(`Đã bỏ role ${roleCode}`);
          setUsers((prev) => prev.map((u) =>
            u.id === userId ? { ...u, roles: u.roles.filter((r) => r !== roleCode) } : u
          ));
          if (selectedUser?.id === userId) {
            setSelectedUser((prev) => prev ? { ...prev, roles: prev.roles.filter((r) => r !== roleCode) } : null);
          }
        } else {
          toast.error('Lỗi bỏ role');
        }
      } else {
        const res = await fetch(`/api/users/${userId}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleCode }),
        });
        if (res.ok) {
          toast.success(`Đã gán role ${roleCode}`);
          setUsers((prev) => prev.map((u) =>
            u.id === userId ? { ...u, roles: [...u.roles, roleCode] } : u
          ));
          if (selectedUser?.id === userId) {
            setSelectedUser((prev) => prev ? { ...prev, roles: [...prev.roles, roleCode] } : null);
          }
        } else {
          toast.error('Lỗi gán role');
        }
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
    setToggling(null);
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Người dùng</h1>
          <p className="text-sm text-muted-foreground">{users.length} người dùng</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email..."
          className="w-full max-w-md px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700"
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse p-4">Đang tải...</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b bg-slate-50 dark:bg-slate-900">
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium">{user.name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? user.roles.map((role) => (
                        <span key={role} className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${ROLE_COLORS[role] || 'bg-gray-100'}`}>
                          {role}
                        </span>
                      )) : (
                        <span className="text-xs text-muted-foreground">Chưa gán</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[11px] rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedUser(user)} className="text-xs text-emerald-600 hover:underline">
                      Sửa role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={() => setSelectedUser(null)}>
          <div className="w-96 max-w-[90vw] bg-white dark:bg-slate-900 h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">{selectedUser.name || selectedUser.email}</h2>
            <p className="text-sm text-muted-foreground mb-6">{selectedUser.email}</p>

            <h3 className="text-sm font-semibold mb-3">Roles</h3>
            <div className="space-y-2">
              {ALL_ROLES.map((role) => {
                const has = selectedUser.roles.includes(role);
                const isToggling = toggling === `${selectedUser.id}-${role}`;
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(selectedUser.id, role, has)}
                    disabled={isToggling}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                      has
                        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm font-medium">{role}</span>
                    <span className={`text-xs font-semibold ${has ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isToggling ? '...' : has ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setSelectedUser(null)} className="mt-6 w-full px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

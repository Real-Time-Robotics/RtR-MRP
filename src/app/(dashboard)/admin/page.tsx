import Link from 'next/link';

export default function AdminPage() {
  const actions = [
    { href: '/admin/users', title: 'Người dùng', desc: 'Quản lý tài khoản, phân quyền người dùng.' },
    { href: '/admin/roles', title: 'Roles', desc: 'Cấu hình vai trò và phân quyền RBAC.' },
    { href: '/admin/feature-flags', title: 'Feature Flags', desc: 'Bật/tắt tính năng theo môi trường.' },
    { href: '/admin/audit', title: 'Audit Log', desc: 'Xem nhật ký hoạt động hệ thống.' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Quản trị</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="rounded border p-4 hover:bg-muted transition-colors">
            <h3 className="font-semibold">{a.title}</h3>
            <p className="text-sm text-muted-foreground">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

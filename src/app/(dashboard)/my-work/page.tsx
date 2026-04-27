import Link from 'next/link';

export default function MyWorkPage() {
  const actions = [
    { href: '/my-work/created', title: 'Lệnh tôi tạo', desc: 'Xem các lệnh sản xuất, lắp ráp bạn đã tạo.' },
    { href: '/my-work/approvals', title: 'Approval', desc: 'Duyệt các yêu cầu đang chờ phê duyệt.' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Công việc của tôi</h1>
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

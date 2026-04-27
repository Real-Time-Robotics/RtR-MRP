import Link from 'next/link';

export default function OperationsPage() {
  const actions = [
    { href: '/operations/work-order', title: 'Gia công', desc: 'Hoàn thành Work Order, sinh serial tự động.', live: true },
    { href: '/operations/assembly', title: 'Lắp ráp', desc: 'Scan child serial, lắp ráp EBOX, sinh parent serial.', live: true },
    { href: '/operations/issue', title: 'Xuất hàng', desc: 'Quét serial → xác nhận xuất cho khách hàng.', live: true },
    { href: '/warehouse-receipts', title: 'Nhận hàng', desc: 'Xác nhận nhận hàng từ nhà cung cấp.', live: true },
    { href: '/inventory/cycle-count', title: 'Kiểm kho', desc: 'Đối chiếu tồn kho thực tế.', badge: 'Sprint 28' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Vận hành</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded border p-4 hover:bg-muted transition-colors relative"
          >
            <h3 className="font-semibold">{a.title}</h3>
            <p className="text-sm text-muted-foreground">{a.desc}</p>
            {a.badge && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold bg-yellow-100 text-yellow-800 rounded">
                {a.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

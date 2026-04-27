import Link from 'next/link';

export default function OperationsPage() {
  const actions = [
    { href: '/operations/work-order', title: 'Gia công', desc: 'Hoàn thành Work Order, sinh serial tự động.' },
    { href: '/operations/assembly', title: 'Lắp ráp', desc: 'Scan child serial, lắp ráp EBOX, sinh parent serial.' },
    { href: '/operations/issue', title: 'Xuất hàng', desc: 'Tạo phiếu xuất kho cho đơn hàng.' },
    { href: '/warehouse-receipts', title: 'Nhận hàng', desc: 'Xác nhận nhận hàng từ nhà cung cấp.' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Vận hành</h1>
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

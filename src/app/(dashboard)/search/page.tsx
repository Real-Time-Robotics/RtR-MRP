import Link from 'next/link';

export default function SearchPage() {
  const actions = [
    { href: '/search/serial', title: 'Serial', desc: 'Tra cứu serial number, xem genealogy parent-child.' },
    { href: '/parts', title: 'Part', desc: 'Tìm kiếm vật tư, linh kiện theo mã hoặc tên.' },
    { href: '/bom', title: 'BOM', desc: 'Tra cứu BOM template, xem cấu trúc sản phẩm.' },
    { href: '/search/lot-history', title: 'Lịch sử lô', desc: 'Xem lịch sử nhập/xuất theo lô hàng.' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Tra cứu</h1>
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

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Không tìm thấy trang</h2>
      <p className="text-gray-600">Trang bạn yêu cầu không tồn tại hoặc đã bị di chuyển.</p>
      <Button asChild>
        <Link href="/home">Về trang chủ</Link>
      </Button>
    </div>
  );
}

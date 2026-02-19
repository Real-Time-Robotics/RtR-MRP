import Link from 'next/link';
import { Truck } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
        <Truck className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Không tìm thấy
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        Đơn mua hàng bạn đang tìm không tồn tại hoặc đã bị xóa.
      </p>
      <Link
        href="/purchasing"
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Quay lại danh sách
      </Link>
    </div>
  );
}

// /dashboard/admin/feature-flags — Feature Flags display (TIP-S27-08)
// Read-only MVP. Admin must edit .env.local and restart to change flags.

import { FEATURE_FLAGS } from '@/lib/feature-flags';

interface FlagInfo {
  key: string;
  label: string;
  description: string;
  value: boolean;
}

const FLAG_DESCRIPTIONS: FlagInfo[] = [
  { key: 'SIDEBAR_V2', label: 'Sidebar V2', description: 'Dùng sidebar mới 9 cụm role-gated thay vì sidebar cũ.', value: FEATURE_FLAGS.SIDEBAR_V2 },
  { key: 'SHOW_FINANCE', label: 'Tài chính', description: 'Hiển thị cụm Tài chính (Hoá đơn, MISA, Chi phí) trong sidebar.', value: FEATURE_FLAGS.SHOW_FINANCE },
  { key: 'SHOW_AI_ML', label: 'AI / ML', description: 'Hiển thị cụm AI/ML (Forecast, Insights, Quality AI) trong sidebar.', value: FEATURE_FLAGS.SHOW_AI_ML },
  { key: 'SHOW_MULTITENANT', label: 'Multi-tenant', description: 'Hiển thị cụm Multi-tenant trong sidebar.', value: FEATURE_FLAGS.SHOW_MULTITENANT },
  { key: 'SHOW_MOBILE', label: 'Mobile', description: 'Hiển thị cụm Mobile trong sidebar.', value: FEATURE_FLAGS.SHOW_MOBILE },
  { key: 'SHOW_COMPLIANCE', label: 'Compliance', description: 'Hiển thị cụm Compliance trong sidebar.', value: FEATURE_FLAGS.SHOW_COMPLIANCE },
];

export default function FeatureFlagsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-1">Cờ tính năng</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Bật/tắt cụm chức năng. Yêu cầu sửa <code className="font-mono text-xs bg-gray-100 dark:bg-gunmetal px-1 rounded">.env.local</code> và restart server.
      </p>

      <div className="space-y-3">
        {FLAG_DESCRIPTIONS.map((flag) => (
          <div
            key={flag.key}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold text-sm">{flag.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                NEXT_PUBLIC_{flag.key}
              </p>
            </div>
            <span
              className={`px-2 py-1 text-xs font-bold rounded ${
                flag.value
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {flag.value ? 'ON' : 'OFF'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-400">
        <strong>Lưu ý:</strong> Để thay đổi cờ tính năng, chỉnh sửa file <code>.env.local</code> rồi restart server.
        Ví dụ: <code>NEXT_PUBLIC_SHOW_FINANCE=true</code>
      </div>
    </div>
  );
}

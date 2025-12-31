// =============================================================================
// RTR MRP - PROFESSIONAL DOCUMENTATION PAGE
// Bilingual EN/VI Documentation with Notion-style UI
// =============================================================================

import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import {
  ChevronLeft,
  BookOpen,
  Terminal,
  Code,
  Network,
  Database,
  Server,
  Settings,
  CloudUpload,
} from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';

// Read markdown files at build time
async function getDocsContent() {
  const docsPath = path.join(process.cwd(), 'docs');

  const docs = [
    { id: 'readme', file: 'README.md', title: 'Overview', titleVi: 'Tổng quan', icon: 'BookOpen' },
    { id: 'setup', file: 'SETUP.md', title: 'Setup Guide', titleVi: 'Hướng dẫn Cài đặt', icon: 'Terminal' },
    { id: 'api', file: 'API.md', title: 'API Reference', titleVi: 'Tài liệu API', icon: 'Code' },
    { id: 'architecture', file: 'ARCHITECTURE.md', title: 'Architecture', titleVi: 'Kiến trúc', icon: 'Network' },
    { id: 'components', file: 'COMPONENTS.md', title: 'Components', titleVi: 'Thành phần', icon: 'Database' },
    { id: 'deployment', file: 'DEPLOYMENT.md', title: 'Deployment', titleVi: 'Triển khai', icon: 'CloudUpload' },
    { id: 'operations', file: 'OPERATIONS.md', title: 'Operations', titleVi: 'Vận hành', icon: 'Settings' },
    { id: 'backup', file: 'BACKUP-RESTORE.md', title: 'Backup & Restore', titleVi: 'Sao lưu & Phục hồi', icon: 'Server' },
  ];

  const contents: Record<string, string> = {};

  for (const doc of docs) {
    const filePath = path.join(docsPath, doc.file);
    try {
      contents[doc.id] = fs.readFileSync(filePath, 'utf-8');
    } catch {
      contents[doc.id] = `# ${doc.title}\n\nDocumentation coming soon...`;
    }
  }

  return { docs, contents };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Terminal,
  Code,
  Network,
  Database,
  Server,
  Settings,
  CloudUpload,
};

export default async function DocsPage() {
  const { docs, contents } = await getDocsContent();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="h-6 w-px bg-neutral-800" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-neutral-800">
                <span className="text-[8px] font-bold text-white font-mono">MRP</span>
              </div>
              <span className="text-sm font-bold font-mono flex items-end">MRP<span className="w-1 h-1 rounded-full bg-orange-500 ml-0.5 mb-0.5 mr-1" />Docs</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500">Bilingual EN/VI</span>
            <Link
              href="/dashboard"
              className="text-sm px-4 py-2 bg-white text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 shrink-0 border-r border-neutral-800 min-h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <nav className="p-4 space-y-1">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-3 py-2">
              Documentation
            </div>
            {docs.map((doc) => {
              const IconComponent = iconMap[doc.icon];
              return (
                <a
                  key={doc.id}
                  href={`#${doc.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors group"
                >
                  {IconComponent && <IconComponent className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />}
                  <div className="flex flex-col">
                    <span>{doc.title}</span>
                    <span className="text-xs text-neutral-600">{doc.titleVi}</span>
                  </div>
                </a>
              );
            })}
          </nav>

          {/* Version Info */}
          <div className="p-4 border-t border-neutral-800 mt-4">
            <div className="px-3 py-2 rounded-lg bg-neutral-900/50 border border-neutral-800">
              <div className="text-xs text-neutral-500">Version</div>
              <div className="text-sm font-mono text-neutral-300">v2.0.0</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {docs.map((doc) => (
            <section
              key={doc.id}
              id={doc.id}
              className="border-b border-neutral-800 last:border-b-0"
            >
              {/* Section Header */}
              <div className="sticky top-16 z-10 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800 px-8 py-4">
                <div className="flex items-center gap-3">
                  {iconMap[doc.icon] && (
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                      {(() => {
                        const IconComp = iconMap[doc.icon];
                        return <IconComp className="w-4 h-4 text-neutral-400" />;
                      })()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">{doc.title}</h2>
                    <p className="text-sm text-neutral-500">{doc.titleVi}</p>
                  </div>
                </div>
              </div>

              {/* Markdown Content */}
              <div className="px-8 py-8">
                <div className="prose prose-invert prose-neutral max-w-none
                  prose-headings:font-semibold prose-headings:tracking-tight
                  prose-h1:text-2xl prose-h1:border-b prose-h1:border-neutral-800 prose-h1:pb-4 prose-h1:mb-6
                  prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
                  prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
                  prose-p:text-neutral-400 prose-p:leading-relaxed
                  prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-neutral-200 prose-strong:font-semibold
                  prose-code:text-emerald-400 prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800 prose-pre:rounded-lg
                  prose-table:border-collapse prose-table:w-full
                  prose-th:bg-neutral-800/50 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-sm prose-th:font-semibold prose-th:border prose-th:border-neutral-700
                  prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-neutral-800 prose-td:text-sm prose-td:text-neutral-400
                  prose-li:text-neutral-400 prose-li:marker:text-neutral-600
                  prose-ul:my-4 prose-ol:my-4
                  prose-hr:border-neutral-800 prose-hr:my-8
                  prose-blockquote:border-l-blue-500 prose-blockquote:bg-neutral-900/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                  prose-img:rounded-lg prose-img:border prose-img:border-neutral-800
                ">
                  <MarkdownRenderer content={contents[doc.id]} />
                </div>
              </div>
            </section>
          ))}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-neutral-800">
              <span className="text-[7px] font-bold text-white font-mono">MRP</span>
            </div>
            <span className="text-xs text-neutral-500 flex items-center">© 2025 MRP<span className="w-1 h-1 rounded-full bg-orange-500 mx-0.5" />System</span>
          </div>
          <div className="text-xs text-neutral-600">
            Bilingual Documentation • EN/VI
          </div>
        </div>
      </footer>
    </div>
  );
}

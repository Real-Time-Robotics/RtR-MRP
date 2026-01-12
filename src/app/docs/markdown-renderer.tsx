'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // Custom code block styling - LIGHT THEME
        pre: ({ children }) => (
          <pre className="overflow-x-auto p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-800">
            {children}
          </pre>
        ),
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;

          if (isInline) {
            return (
              <code className="text-rose-600 bg-gray-100 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                {children}
              </code>
            );
          }

          return (
            <code className={`block text-[13px] leading-relaxed text-gray-800 font-mono ${className}`} {...props}>
              {children}
            </code>
          );
        },
        // Custom table styling - LIGHT THEME
        table: ({ children }) => (
          <div className="overflow-x-auto my-6 rounded-xl border border-gray-200">
            <table className="w-full">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-900 border-b border-gray-200">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-[14px] text-gray-700 border-b border-gray-100">
            {children}
          </td>
        ),
        // Custom link styling
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        // Custom heading anchors
        h1: ({ children }) => (
          <h1 className="text-[24px] font-semibold tracking-tight text-gray-900 border-b border-gray-200 pb-4 mb-6">
            {children}
          </h1>
        ),
        h2: ({ children }) => {
          const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <h2 id={id} className="text-[20px] font-semibold text-gray-900 mt-10 mb-4 scroll-mt-32">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => (
          <h3 className="text-[17px] font-semibold text-gray-900 mt-8 mb-3">{children}</h3>
        ),
        // Custom blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 bg-blue-50 py-3 px-4 rounded-r-xl my-4 text-gray-700">
            {children}
          </blockquote>
        ),
        // Custom list styling
        ul: ({ children }) => (
          <ul className="my-4 space-y-2 list-disc list-inside text-gray-700">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 space-y-2 list-decimal list-inside text-gray-700">{children}</ol>
        ),
        // Custom horizontal rule
        hr: () => <hr className="border-gray-200 my-8" />,
        // Custom paragraph
        p: ({ children }) => (
          <p className="text-gray-700 leading-relaxed my-4 text-[15px]">{children}</p>
        ),
        // Custom image - preserve width/height attributes
        img: ({ src, alt, width, height, ...props }) => (
          <img
            src={src}
            alt={alt || ''}
            width={width}
            height={height}
            style={width || height ? { width, height, maxWidth: '100%' } : undefined}
            className="rounded-xl border border-gray-200 shadow-sm my-4 inline-block"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

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
        // Custom code block styling
        pre: ({ children }) => (
          <pre className="overflow-x-auto p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            {children}
          </pre>
        ),
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;

          if (isInline) {
            return (
              <code className="text-emerald-400 bg-neutral-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          }

          return (
            <code className={`block text-sm leading-relaxed ${className}`} {...props}>
              {children}
            </code>
          );
        },
        // Custom table styling
        table: ({ children }) => (
          <div className="overflow-x-auto my-6 rounded-lg border border-neutral-800">
            <table className="w-full">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-neutral-800/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-200 border-b border-neutral-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-sm text-neutral-400 border-b border-neutral-800">
            {children}
          </td>
        ),
        // Custom link styling
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        // Custom heading anchors
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold tracking-tight border-b border-neutral-800 pb-4 mb-6">
            {children}
          </h1>
        ),
        h2: ({ children }) => {
          const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return (
            <h2 id={id} className="text-xl font-semibold mt-10 mb-4 scroll-mt-32">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-8 mb-3">{children}</h3>
        ),
        // Custom blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 bg-neutral-900/50 py-2 px-4 rounded-r-lg my-4 text-neutral-400">
            {children}
          </blockquote>
        ),
        // Custom list styling
        ul: ({ children }) => (
          <ul className="my-4 space-y-2 list-disc list-inside text-neutral-400">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 space-y-2 list-decimal list-inside text-neutral-400">{children}</ol>
        ),
        // Custom horizontal rule
        hr: () => <hr className="border-neutral-800 my-8" />,
        // Custom paragraph
        p: ({ children }) => (
          <p className="text-neutral-400 leading-relaxed my-4">{children}</p>
        ),
        // Custom image - preserve width/height attributes
        img: ({ src, alt, width, height, ...props }) => (
          <img
            src={src}
            alt={alt || ''}
            width={width}
            height={height}
            style={width || height ? { width, height, maxWidth: '100%' } : undefined}
            className="rounded-lg border border-neutral-800 my-4 inline-block"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

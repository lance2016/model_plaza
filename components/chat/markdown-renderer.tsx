'use client';

import { useState, useCallback, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/70 hover:text-foreground rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">已复制</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>复制</span>
        </>
      )}
    </button>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="not-prose my-3 rounded-lg overflow-hidden border border-border/50 bg-[#282c34]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-border/30">
        <span className="text-[11px] text-muted-foreground/60 font-mono">{language || 'text'}</span>
        <CopyButton code={code} />
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
        codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-muted text-[0.85em] font-mono text-foreground/90 border border-border/30">
      {children}
    </code>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');

          // Block code (has language class or is multiline)
          if (match || code.includes('\n')) {
            return <CodeBlock language={match?.[1] || ''} code={code} />;
          }

          // Inline code
          return <InlineCode {...props}>{children}</InlineCode>;
        },
        // Better table rendering
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-muted/50 border-b border-border/50">{children}</thead>;
        },
        th({ children }) {
          return <th className="px-3 py-2 text-left font-medium text-foreground/80 text-xs">{children}</th>;
        },
        td({ children }) {
          return <td className="px-3 py-2 border-t border-border/30 text-foreground/70">{children}</td>;
        },
        // Links open in new tab
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDeflist from 'remark-deflist';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

export default function MarkdownComponent({ text }: { text: string }) {
  const components: Components = {
    h1: ({ node, children, ...props }) => (
      <h1 className="text-2xl font-bold mt-6 mb-4" {...props}>
        {children || 'Untitled Heading'}
      </h1>
    ),
    h2: ({ node, children, ...props }) => (
      <h2 className="text-xl font-bold mt-5 mb-3" {...props}>
        {children || 'Untitled Heading'}
      </h2>
    ),
    h3: ({ node, children, ...props }) => (
      <h3 className="text-lg font-bold mt-4 mb-2" {...props}>
        {children || 'Untitled Heading'}
      </h3>
    ),
    p: ({ node, ...props }) => <p className="my-3" {...props} />,
    a: ({ node, children, ...props }) => (
      <a className="text-blue-600 hover:underline" {...props}>
        {children || 'Untitled Anchor'}
      </a>
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc ml-5 my-3" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal ml-5 my-3" {...props} />
    ),
    li: ({ node, children, ...props }) => (
      <li className="my-1" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="border-l-4 border-gray-400 pl-4 italic my-3 text-gray-700"
        {...props}
      />
    ),
    table: ({ node, ...props }) => (
      <div className="my-4 overflow-x-auto">
        <table className="border-collapse w-full" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-gray-200" {...props} />,
    tr: ({ node, ...props }) => (
      <tr className="border-b border-gray-300" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="py-2 px-3 text-left border" {...props} />
    ),
    td: ({ node, ...props }) => <td className="py-2 px-3 border" {...props} />,
    code: (props) => {
      const { children, className, node, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <SyntaxHighlighter
          language={match[1]}
          PreTag="div"
          className="rounded-2xl my-3"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code
          {...rest}
          className={`bg-gray-200 px-1 py-0.5 rounded text-sm ${className || ''}`}
        >
          {children}
        </code>
      );
    },
    input: ({ node, ...props }) =>
      props.type === 'checkbox' ? (
        <input
          type="checkbox"
          className="mr-1 rounded"
          checked={props.checked}
          readOnly
        />
      ) : null,
    dt: ({ node, ...props }) => <dt className="font-bold mt-2" {...props} />,
    dd: ({ node, ...props }) => <dd className="ml-4 mb-2" {...props} />,
    sup: ({ node, ...props }) => (
      <sup className="text-xs text-blue-600" {...props} />
    ),
  };

  return (
    <ReactMarkdown
      remarkPlugins={[
        [remarkGfm, { singleTilde: false }],
        remarkDeflist,
        remarkBreaks,
      ]}
      components={components}
    >
      {text}
    </ReactMarkdown>
  );
}

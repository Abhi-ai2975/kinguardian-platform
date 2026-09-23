interface CodeBlockProps {
  code: string;
  title?: string;
}

export function CodeBlock({ code, title }: CodeBlockProps) {
  return (
    <div>
      {title && (
        <div
          style={{
            padding: "8px 16px",
            background: "#161b27",
            borderRadius: "8px 8px 0 0",
            fontSize: 12,
            color: "#6c7086",
            fontFamily: "monospace",
          }}
        >
          {title}
        </div>
      )}
      <pre
        className="code-block"
        style={{ borderRadius: title ? "0 0 8px 8px" : 8 }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

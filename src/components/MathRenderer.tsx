import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const renderMath = (text: string) => {
        let html = text || '';

        // 1. Display math: \[ ... \] or $$ ... $$
        html = html.replace(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, (match, p1, p2) => {
          const math = p1 || p2;
          try {
            return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
          } catch (e) {
            return match;
          }
        });

        // 2. Inline math: \( ... \) or $ ... $ (excluding $$)
        html = html.replace(/\\\(([\s\S]*?)\\\)|\$([^\$\n]+?)\$/g, (match, p1, p2) => {
          const math = p1 || p2;
          try {
            return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          } catch (e) {
            return match;
          }
        });

        // 3. Auto-detect and render standalone roots or powers if Gemini outputs unformatted math e.g. "3√3" or "√3"
        html = html.replace(/(^|\s|>)([0-9]*)\s*√([0-9a-zA-Z]+)/g, (match, prefix, coef, num) => {
          try {
            const formula = coef ? `${coef}\\sqrt{${num}}` : `\\sqrt{${num}}`;
            return `${prefix}${katex.renderToString(formula, { displayMode: false, throwOnError: false })}`;
          } catch {
            return match;
          }
        });

        // Simple markdown basic styling for bold/newlines
        html = html.replace(/\n/g, '<br />');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        return html;
      };

      containerRef.current.innerHTML = renderMath(content);
    }
  }, [content]);

  return <div ref={containerRef} className="math-content text-textMain inline" />;
};

export default MathRenderer;

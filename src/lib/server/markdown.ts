// Minimal, safe Markdown -> HTML renderer.
// Supports: headings (h1-h3), bold, italic, inline code, code blocks,
// unordered lists (- or *), ordered lists (1.), blockquotes, links,
// horizontal rules, paragraphs. Escapes all HTML first.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  let out = s;
  // inline code
  out = out.replace(/`([^`]+)`/g, (_, c: string) => `<code>${c}</code>`);
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // links [text](http(s)://...)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, text: string, href: string) =>
      `<a href="${href}" rel="noopener noreferrer" target="_blank">${text}</a>`,
  );
  return out;
}

export function renderMarkdown(src: string): string {
  const escaped = escapeHtml(src);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];

  let inUl = false;
  let inOl = false;
  let inCode = false;
  let paraBuf: string[] = [];

  function flushPara(): void {
    if (paraBuf.length === 0) return;
    out.push(`<p>${inline(paraBuf.join(" "))}</p>`);
    paraBuf = [];
  }
  function closeLists(): void {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      flushPara();
      closeLists();
      if (!inCode) {
        out.push("<pre><code>");
        inCode = true;
      } else {
        out.push("</code></pre>");
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      closeLists();
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushPara();
      closeLists();
      out.push("<hr />");
      continue;
    }

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara();
      closeLists();
      const level = m[1].length;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
      continue;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      flushPara();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    if ((m = line.match(/^&gt;\s+(.*)$/))) {
      flushPara();
      closeLists();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      continue;
    }

    paraBuf.push(line.trim());
  }

  flushPara();
  closeLists();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

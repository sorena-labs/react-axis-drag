import type { ReactNode } from "react";

// One pass over the source. Each group is a kind of token; where two could start at the same place, the earlier wins.
const TOKEN =
  /(\/\/.*)|("(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|\b([A-Za-z][\w-]*)(?==[{"])|\b([A-Za-z_$][\w$]*)(?=\??:(?!:))|\b(import|from|const|let|return|if|else|new|true|false|null|undefined)\b|\b(\d[\d_.]*)\b|(<\/?[A-Za-z][\w.]*)|\b([A-Za-z_$][\w$]*)(?=\()/g;
const KINDS = ["comment", "string", "key", "key", "keyword", "number", "tag", "call"];

/**
 * The site's snippets, coloured. ponytail: a regex, not a parser; it knows only the TypeScript and JSX these snippets use.
 * Swap in a real highlighter if the snippets grow past that.
 */
export function Code({ children }: { children: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of children.matchAll(TOKEN)) {
    const at = match.index!;
    const kind = KINDS[match.slice(1).findIndex((group) => group !== undefined)];
    out.push(
      children.slice(last, at),
      <span key={at} className={`tok-${kind}`}>
        {match[0]}
      </span>,
    );
    last = at + match[0].length;
  }
  out.push(children.slice(last));
  return <code>{out}</code>;
}

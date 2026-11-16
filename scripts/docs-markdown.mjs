/**
 * HTML to Markdown for the documentation pages (ADR-001, D9: every page is
 * also served as .md, and llms-full.txt joins them). It only knows the small
 * set of tags the content fragments use; anything else is reduced to its text.
 * No dependencies, like the rest of the site.
 */

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&amp;': '&' };
const decode = (text) => text.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (entity) => ENTITIES[entity]);

/** Removes every tag, repeating until none is left, so nested leftovers like "<<b>x>" go too. */
function stripTags(html) {
  let previous;
  do {
    previous = html;
    html = html.replace(/<[^>]*>/g, '');
  } while (html !== previous);
  return html;
}

/** Inline markup: links (made absolute), code, emphasis; other tags are dropped. */
function inline(html, base) {
  return decode(
    stripTags(
      html
        .replace(/<span class="(?:prompt|ps)"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, text) => `[${inline(text, base)}](${new URL(decode(href), base).href})`)
        .replace(/<code>([\s\S]*?)<\/code>/g, (_, code) => `\`${stripTags(code)}\``)
        .replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, '**$2**')
        .replace(/<(em|i)>([\s\S]*?)<\/\1>/g, '*$2*')
        .replace(/<br\s*\/?>/g, '\n')
    )
  )
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Code blocks: "$ " prompts back as text, markup removed, entities decoded. */
function codeBlock(body) {
  const text = decode(stripTags(body.replace(/<span class="ps"[^>]*>[\s\S]*?<\/span>/g, '$ ')));
  const fence = text.includes('```') ? '````' : '```';
  return `${fence}\n${text.replace(/\n+$/, '')}\n${fence}`;
}

function list(items, ordered, base) {
  return items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}.` : '-';
      const body = blocks(item, base).join('\n\n');
      return `${marker} ${body.replace(/\n/g, '\n   ')}`;
    })
    .join('\n');
}

const matchAll = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1]);

function table(html, base) {
  const rows = matchAll(html, /<tr>([\s\S]*?)<\/tr>/g).map((row) =>
    matchAll(row, /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g).map((cell) => inline(cell, base).replace(/[\\|]/g, '\\$&'))
  );
  if (rows.length === 0) return '';
  const caption = /<caption>([\s\S]*?)<\/caption>/.exec(html);
  const [head, ...body] = rows;
  return [
    ...(caption ? [`*${inline(caption[1], base)}*`, ''] : []),
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
}

const BLOCK = /<(h[1-4]|p|pre|ul|ol|dl|table|div|section|details|summary)\b[^>]*>([\s\S]*?)<\/\1>/y;

/** Splits a fragment into Markdown blocks, in order. */
function blocks(html, base) {
  const out = [];
  let index = 0;
  let loose = '';
  const flush = () => {
    if (loose.trim()) out.push(inline(loose, base));
    loose = '';
  };
  while (index < html.length) {
    BLOCK.lastIndex = index;
    const match = BLOCK.exec(html);
    if (!match) {
      loose += html[index++];
      continue;
    }
    flush();
    const [whole, tag, body] = match;
    index += whole.length;
    if (/^h[1-4]$/.test(tag)) out.push(`${'#'.repeat(Number(tag[1]))} ${inline(body, base)}`);
    else if (tag === 'p' || tag === 'summary') out.push(inline(body, base));
    else if (tag === 'pre') out.push(codeBlock(/<code>([\s\S]*?)<\/code>/.exec(body)?.[1] ?? body));
    else if (tag === 'ul' || tag === 'ol') out.push(list(matchAll(body, /<li>([\s\S]*?)<\/li>/g), tag === 'ol', base));
    else if (tag === 'dl') {
      const pairs = [...body.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)];
      out.push(pairs.map(([, term, text]) => `- **${inline(term, base)}**: ${inline(text, base)}`).join('\n'));
    } else if (tag === 'table') out.push(table(body, base));
    else out.push(...blocks(body, base)); // div, section, details: their content
  }
  flush();
  return out.filter((block) => block.length > 0);
}

/** Markdown of a rendered content fragment; relative links resolve against `baseUrl`. */
export function htmlToMarkdown(html, baseUrl) {
  return `${blocks(html, baseUrl).join('\n\n')}\n`;
}

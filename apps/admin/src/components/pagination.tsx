/** Классическая постраничная навигация «← 1 2 3 →» для admin-таблиц. */
export function Pagination({
  total,
  limit,
  page,
  onPage,
}: {
  total: number;
  limit: number;
  page: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  // Окно из максимум 5 номеров вокруг текущей страницы
  const win = 2;
  let from = Math.max(1, page - win);
  let to = Math.min(pages, page + win);
  if (to - from < 4) {
    if (from === 1) to = Math.min(pages, from + 4);
    else if (to === pages) from = Math.max(1, to - 4);
  }
  const nums: number[] = [];
  for (let i = from; i <= to; i++) nums.push(i);

  const btn = (active: boolean) =>
    ({
      minWidth: 34,
      height: 34,
      padding: '0 10px',
      borderRadius: 8,
      border: '1px solid var(--line2, var(--line))',
      background: active ? 'var(--accent-soft)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text)',
      font: '600 13px/1 var(--ui)',
      cursor: 'pointer',
    }) as const;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', flexWrap: 'wrap' }}>
      <span className="num" style={{ fontSize: 12.5, color: 'var(--faint, var(--text-dim))' }}>
        стр. {page} из {pages} · всего {total}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={{ ...btn(false), opacity: page <= 1 ? 0.4 : 1 }} disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
        {from > 1 && (
          <>
            <button style={btn(false)} onClick={() => onPage(1)}>1</button>
            {from > 2 && <span style={{ color: 'var(--faint, var(--text-dim))' }}>…</span>}
          </>
        )}
        {nums.map((n) => (
          <button key={n} style={btn(n === page)} onClick={() => onPage(n)}>{n}</button>
        ))}
        {to < pages && (
          <>
            {to < pages - 1 && <span style={{ color: 'var(--faint, var(--text-dim))' }}>…</span>}
            <button style={btn(false)} onClick={() => onPage(pages)}>{pages}</button>
          </>
        )}
        <button style={{ ...btn(false), opacity: page >= pages ? 0.4 : 1 }} disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
      </div>
    </div>
  );
}

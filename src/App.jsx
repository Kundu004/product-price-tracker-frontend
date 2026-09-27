import { useEffect, useState } from 'react';
import { api } from './api';

const styles = {
  page: { fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: 24, color: '#1a1a1a' },
  tabs: { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #ddd' },
  tab: (active) => ({
    padding: '8px 16px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    fontSize: 15,
    fontWeight: active ? 600 : 400,
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    color: active ? '#2563eb' : '#555',
  }),
  input: { padding: '8px 10px', fontSize: 14, border: '1px solid #ccc', borderRadius: 6, width: 280 },
  button: { padding: '8px 14px', fontSize: 14, border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer' },
  buttonSecondary: { padding: '6px 12px', fontSize: 13, border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer' },
  buttonDanger: { padding: '6px 12px', fontSize: 13, border: '1px solid #dc2626', borderRadius: 6, background: '#fff', color: '#dc2626', cursor: 'pointer' },
  card: { border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, marginBottom: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 },
  th: { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #ddd', color: '#555' },
  td: { padding: '6px 8px', borderBottom: '1px solid #eee' },
  badge: (outcome) => ({
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: outcome === 'success' ? '#dcfce7' : outcome === 'retried' ? '#fef9c3' : '#fee2e2',
    color: outcome === 'success' ? '#166534' : outcome === 'retried' ? '#854d0e' : '#991b1b',
  }),
  error: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  muted: { color: '#888', fontSize: 13 },
};

function SearchAndTrack({ onTracked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // full item detail
  const [chosenOptionId, setChosenOptionId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    setSelected(null);
    if (!query.trim()) return;
    try {
      const data = await api.searchProducts(query);
      // De-duplicate by id — the store's listing pages can return the
      // same product more than once across pages.
      const seen = new Set();
      setResults(data.filter((p) => (seen.has(p.id) ? false : seen.add(p.id))));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePick(product) {
    setError('');
    setStatus('');
    try {
      const detail = await api.getItem(product.id);
      setSelected(detail);
      setChosenOptionId(detail.options?.[0]?.id || '');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTrack() {
    if (!selected || !chosenOptionId) return;
    const option = selected.options.find((o) => o.id === chosenOptionId);
    setError('');
    setStatus('Tracking...');
    try {
      await api.trackProduct({
        storeProductId: String(selected.id),
        productName: selected.name,
        selectedOption: option.id,
        optionLabel: option.label,
      });
      setStatus(`Now tracking "${selected.name}" (${option.label}).`);
      onTracked();
    } catch (err) {
      setStatus('');
      setError(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={styles.input}
          placeholder="Search products by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button style={styles.button} type="submit">Search</button>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {!selected && results.length > 0 && (
        <div>
          {results.map((p) => (
            <div key={p.id} style={styles.card}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={styles.muted}>{p.brand} · {p.category} · ID {p.id}</div>
              <div style={{ marginTop: 8 }}>
                <button style={styles.buttonSecondary} onClick={() => handlePick(p)}>
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={styles.card}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{selected.name}</div>
          <div style={styles.muted}>ID {selected.id} · {selected.brand}</div>
          <p style={{ fontSize: 14 }}>{selected.description}</p>

          <label style={{ fontSize: 13, fontWeight: 600 }}>
            {selected.optionAxis || 'Option'}:
          </label>
          <div style={{ margin: '8px 0' }}>
            <select
              style={styles.input}
              value={chosenOptionId}
              onChange={(e) => setChosenOptionId(e.target.value)}
            >
              {selected.options?.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.button} onClick={handleTrack}>Track this product</button>
            <button style={styles.buttonSecondary} onClick={() => setSelected(null)}>Back to results</button>
          </div>
          {status && <div style={{ ...styles.muted, marginTop: 8 }}>{status}</div>}
        </div>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }) {
  return <span style={styles.badge(outcome)}>{outcome}</span>;
}

function ProductDetailPanel({ product, onUntrack }) {
  const [tab, setTab] = useState('history');
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([api.getHistory(product.id), api.getLogs(product.id)])
      .then(([h, l]) => {
        if (cancelled) return;
        setHistory(h);
        setLogs(l);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  return (
    <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: '2px solid #eee' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <button
          style={{ ...styles.buttonSecondary, fontWeight: tab === 'history' ? 700 : 400 }}
          onClick={() => setTab('history')}
        >
          Price/Stock History
        </button>
        <button
          style={{ ...styles.buttonSecondary, fontWeight: tab === 'logs' ? 700 : 400 }}
          onClick={() => setTab('logs')}
        >
          Scrape Log
        </button>
      </div>

      {loading && <div style={styles.muted}>Loading...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && tab === 'history' && (
        history.length === 0 ? (
          <div style={styles.muted}>No successful scrapes yet.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp (UTC)</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td style={styles.td}>{h.attempted_at}</td>
                  <td style={styles.td}>{h.price}</td>
                  <td style={styles.td}>{h.stock}</td>
                  <td style={styles.td}><OutcomeBadge outcome={h.outcome} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {!loading && tab === 'logs' && (
        logs.length === 0 ? (
          <div style={styles.muted}>No scrape attempts yet.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp (UTC)</th>
                <th style={styles.th}>Outcome</th>
                <th style={styles.th}>Retries</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={styles.td}>{l.attempted_at}</td>
                  <td style={styles.td}><OutcomeBadge outcome={l.outcome} /></td>
                  <td style={styles.td}>{l.retry_count}</td>
                  <td style={styles.td}>{l.price ?? '—'}</td>
                  <td style={styles.td}>{l.stock ?? '—'}</td>
                  <td style={{ ...styles.td, maxWidth: 320, fontSize: 11, color: '#991b1b' }}>
                    {l.error_reason || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      <button style={{ ...styles.buttonDanger, marginTop: 12 }} onClick={() => onUntrack(product.id)}>
        Untrack this product
      </button>
    </div>
  );
}

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setError('');
      const data = await api.listTracked();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUntrack(id) {
    if (!confirm('Untrack this product? Its history will be preserved.')) return;
    try {
      await api.untrackProduct(id);
      if (expandedId === id) setExpandedId(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Tracked Products</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.buttonSecondary} onClick={refresh}>Refresh</button>
          <a href={api.exportCsvUrl()} style={{ textDecoration: 'none' }}>
            <button style={styles.button}>Export CSV</button>
          </a>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {products.length === 0 && (
        <div style={styles.muted}>No products tracked yet — go to "Search &amp; Track" to add one.</div>
      )}

      {products.map((p) => (
        <div key={p.id} style={styles.card}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{p.product_name}</div>
              <div style={styles.muted}>
                Option: {p.option_label || p.selected_option} · Store ID {p.store_product_id}
              </div>
            </div>
            <div style={styles.muted}>{expandedId === p.id ? '▲' : '▼'}</div>
          </div>
          {expandedId === p.id && <ProductDetailPanel product={p} onUntrack={handleUntrack} />}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={styles.page}>
      <h1 style={{ fontSize: 22 }}>Product Price Tracker</h1>
      <div style={styles.tabs}>
        <button style={styles.tab(tab === 'dashboard')} onClick={() => setTab('dashboard')}>
          Dashboard
        </button>
        <button style={styles.tab(tab === 'search')} onClick={() => setTab('search')}>
          Search &amp; Track
        </button>
      </div>

      {tab === 'dashboard' && <Dashboard key={refreshKey} />}
      {tab === 'search' && (
        <SearchAndTrack
          onTracked={() => {
            setTab('dashboard');
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { apiClient } from '../config/api';

interface SearchResult {
  id: string;
  name: string;
  project: string;
  type: 'lead' | 'customer';
}

export const SearchModal = () => {
  const { searchOpen, setSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  // Focus input when opened
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [searchOpen]);

  // Handle Search Queries
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      try {
        const [leadsRes, custsRes] = await Promise.all([
          apiClient.get(`/leads?search=${query}`),
          apiClient.get(`/customers?search=${query}`)
        ]);

        const formattedLeads = (leadsRes.data || []).map((l: any) => ({
          id: l.id,
          name: l.name,
          project: l.project,
          type: 'lead' as const
        }));

        const formattedCusts = (custsRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          project: c.project,
          type: 'customer' as const
        }));

        setResults([...formattedLeads, ...formattedCusts].slice(0, 10));
      } catch (err) {
        console.error("Search query fetch failed", err);
      }
    };

    const timer = setTimeout(fetchResults, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (!searchOpen) return null;

  return (
    <dialog 
      open 
      className="dialog" 
      id="search-dialog" 
      onClick={(e) => {
        if (e.target === e.currentTarget) setSearchOpen(false);
      }}
      style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
    >
      <div className="search-dialog-inner" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: 'var(--spacing-3) var(--spacing-4)' }}>
          <input
            ref={inputRef}
            type="text"
            className="form-control"
            placeholder="Search leads, customers, IDs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ border: 'none', padding: 0, fontSize: 'var(--font-size-md)', flex: 1, outline: 'none', background: 'transparent', color: 'var(--text-main)' }}
          />
          <button className="dialog-close" onClick={() => setSearchOpen(false)} style={{ margin: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ESC</span>
          </button>
        </div>

        <div className="search-results" style={{ maxHeight: '300px', overflowY: 'auto', padding: 'var(--spacing-2) 0' }}>
          {results.length === 0 ? (
            <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              {query ? 'No matching records found.' : 'Type to search leads and customers database...'}
            </div>
          ) : (
            results.map(r => (
              <div
                key={`${r.type}-${r.id}`}
                className="search-item"
                onClick={() => {
                  setSearchOpen(false);
                  navigate(r.type === 'lead' ? `/leads/${r.id}` : `/customers/${r.id}`);
                }}
                style={{
                  padding: 'var(--spacing-3) var(--spacing-4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)' }}>{r.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{r.project} &bull; {r.id}</div>
                </div>
                <span className={`badge ${r.type === 'lead' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '10px' }}>
                  {r.type.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
};

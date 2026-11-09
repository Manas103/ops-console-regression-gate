import { useCallback, useEffect, useState } from 'react';
import type { Incident } from './types';
import { ackIncident, fetchIncident, fetchIncidents, resolveIncident } from './api';
import { IncidentList } from './components/IncidentList';
import { IncidentDetail } from './components/IncidentDetail';
import { Checkout } from './components/Checkout';
import './app.css';

export default function App() {
  const [view, setView] = useState<'incidents' | 'checkout'>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(() => {
    setLoading(true);
    fetchIncidents(statusFilter)
      .then(setIncidents)
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId == null) {
      setSelected(null);
      return;
    }
    fetchIncident(selectedId)
      .then(setSelected)
      .catch((e) => setError(String(e.message ?? e)));
  }, [selectedId]);

  const handleAck = async () => {
    if (selectedId == null) return;
    setError(null);
    try {
      const updated = await ackIncident(selectedId);
      setSelected(updated);
      loadList();
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  };

  const handleResolve = async () => {
    if (selectedId == null) return;
    setError(null);
    try {
      const updated = await resolveIncident(selectedId);
      setSelected(updated);
      loadList();
    } catch (e: any) {
      setError(String(e.message ?? e));
    }
  };

  return (
    <div className="app">
      <h1>Operations Console</h1>
      <nav>
        <button data-testid="nav-incidents" onClick={() => setView('incidents')}>
          Incidents
        </button>
        <button data-testid="nav-checkout" onClick={() => setView('checkout')}>
          Checkout
        </button>
      </nav>
      {view === 'checkout' ? (
        <Checkout />
      ) : selectedId == null ? (
        <IncidentList
          incidents={incidents}
          loading={loading}
          statusFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onSelect={setSelectedId}
        />
      ) : (
        <IncidentDetail
          incident={selected}
          error={error}
          onAck={handleAck}
          onResolve={handleResolve}
          onBack={() => {
            setSelectedId(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

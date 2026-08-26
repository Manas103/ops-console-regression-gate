import type { Incident } from '../types';

interface Props {
  incidents: Incident[];
  loading: boolean;
  statusFilter: string;
  onFilterChange: (value: string) => void;
  onSelect: (id: number) => void;
}

export function IncidentList({ incidents, loading, statusFilter, onFilterChange, onSelect }: Props) {
  return (
    <section>
      <label htmlFor="status-filter">Status</label>
      <select
        id="status-filter"
        data-testid="status-filter"
        value={statusFilter}
        onChange={(e) => onFilterChange(e.target.value)}
      >
        <option value="ALL">All</option>
        <option value="OPEN">Open</option>
        <option value="ACKNOWLEDGED">Acknowledged</option>
        <option value="RESOLVED">Resolved</option>
      </select>

      {loading ? <p data-testid="list-loading">Loading...</p> : null}

      <ul data-testid="incident-list">
        {incidents.map((inc) => (
          <li key={inc.id} data-testid={`incident-row-${inc.id}`}>
            <span data-testid={`incident-row-title-${inc.id}`}>{inc.title}</span>{' '}
            <span data-testid={`incident-row-status-${inc.id}`}>{inc.status}</span>{' '}
            <span data-testid={`incident-row-severity-${inc.id}`}>{inc.severity}</span>{' '}
            <button data-testid={`view-incident-${inc.id}`} onClick={() => onSelect(inc.id)}>
              View
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

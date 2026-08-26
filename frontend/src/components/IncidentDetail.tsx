import type { Incident } from '../types';

interface Props {
  incident: Incident | null;
  error: string | null;
  onAck: () => void;
  onResolve: () => void;
  onBack: () => void;
}

export function IncidentDetail({ incident, error, onAck, onResolve, onBack }: Props) {
  return (
    <section data-testid="incident-detail">
      <button data-testid="back-to-list" onClick={onBack}>
        Back to list
      </button>
      {!incident ? (
        <p data-testid="detail-loading">Loading...</p>
      ) : (
        <>
          <h2>{incident.title}</h2>
          <p>{incident.description}</p>
          <p>
            Status: <span data-testid="incident-status">{incident.status}</span>
          </p>
          <p>Severity: {incident.severity}</p>
          {error ? <p data-testid="action-error">{error}</p> : null}
          <button data-testid="ack-button" onClick={onAck} disabled={incident.status !== 'OPEN'}>
            Acknowledge
          </button>
          <button
            data-testid="resolve-button"
            onClick={onResolve}
            disabled={incident.status !== 'ACKNOWLEDGED'}
          >
            Resolve
          </button>
        </>
      )}
    </section>
  );
}

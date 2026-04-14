import './DetailPageLayout.css';

export default function DetailPageLayout({
  title,
  badge,
  onBack,
  error,
  onDismissError,
  children,
  actions
}) {
  return (
    <div className="detail-page">
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button
            type="button"
            className="close-error-btn"
            onClick={onDismissError}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="detail-header">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <h1>{title}</h1>
        {badge}
      </div>

      <div className="detail-content">
        {children}
      </div>

      {actions && (
        <div className="detail-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

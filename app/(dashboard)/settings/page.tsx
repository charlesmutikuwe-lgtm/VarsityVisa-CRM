export default function SettingsPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          System settings will be expanded after the core CRM is stable.
        </p>
      </div>
      <div className="card">
        <h3 className="text-sm font-semibold mb-2">Current Version</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Varsity Visa CRM Lite — rule-based scoring, Supabase database, Netlify deployment, and WhatsApp placeholders.
        </p>
      </div>
    </div>
  )
}

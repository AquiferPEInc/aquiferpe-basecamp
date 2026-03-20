export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Overview of Aquifer PE business applications
        </p>
      </div>

      <div className="card mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Welcome to Aquifer PE</h2>
        <p className="text-slate-600 mb-4">
          This platform helps you manage company records, clients, and email campaigns.
          Use the sidebar to navigate to the different sections.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-2">Company Database</h3>
            <p className="text-sm text-slate-600">
              Browse, search, and manage portfolio companies and prospects.
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-2">Client Directory</h3>
            <p className="text-sm text-slate-600">
              Manage professional clients and their relationships to companies.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
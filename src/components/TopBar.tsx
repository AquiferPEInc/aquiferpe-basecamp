export default function TopBar() {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-8 py-5 flex items-center">
        <div className="flex items-center space-x-5">
          {/* Logo */}
          <div className="w-18 h-18 flex items-center justify-center">
            <img src="/aquifer_logo.jpg" alt="Aquifer PE Logo" className="w-16 h-16" />
          </div>
          <div>
            <h1 className="text-5xl font-bold text-slate-900">Aquifer PE - Basecamp</h1>
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-4">
          </div>
        </div>
      </div>
    </header>
  )
}
import { ReactNode } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'

interface LayoutProps {
  children?: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar currentPath={location.pathname} />
        <main className="flex-1 p-8">
          <div className="max-w-[95%] mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}
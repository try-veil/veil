import { FontProvider } from '@/context/font-context'
import { ThemeProvider } from '@/context/theme-context'
// import './index.css'

export default function DashboardLayout({ children }: {
    children: React.ReactNode
  }) {
    return (
         {children}
    )
  }
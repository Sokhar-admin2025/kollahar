'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Users, Car, BarChart2, Upload, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',               icon: LayoutGrid, label: 'Översikt'       },
  { href: '/dashboard/leads',         icon: Users,      label: 'Leads'          },
  { href: '/dashboard/annonser',      icon: Car,        label: 'Annonser'       },
  { href: '/dashboard/statistik',     icon: BarChart2,  label: 'Statistik'      },
  { href: '/dashboard/import',        icon: Upload,     label: 'Importera CSV'  },
  { href: '/dashboard/installningar', icon: Settings,   label: 'Inställningar'  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col items-center py-4 gap-2 shrink-0"
      style={{ width: '52px', background: '#0F172A', minHeight: '100vh' }}
    >
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            className="flex items-center justify-center rounded-lg transition w-9 h-9"
            style={{
              background: active ? '#2563EB' : '#1E293B',
              color: active ? '#FFFFFF' : '#64748B',
            }}
          >
            <Icon size={18} strokeWidth={1.75} />
          </Link>
        )
      })}
    </aside>
  )
}

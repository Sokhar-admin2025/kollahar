'use client'

import { HeaderOptionsProvider } from '@/app/context/HeaderOptionsContext'
import Header from '@/app/components/organisms/Header'

interface LayoutWithHeaderProps {
  initialUserId: string | null
  initialIsVerified: boolean
  children: React.ReactNode
}

export default function LayoutWithHeader({
  initialUserId,
  initialIsVerified,
  children,
}: LayoutWithHeaderProps) {
  return (
    <HeaderOptionsProvider>
      <Header initialUserId={initialUserId} initialIsVerified={initialIsVerified} />
      {children}
    </HeaderOptionsProvider>
  )
}

import { Urbanist } from 'next/font/google'

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function RegistreraLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={urbanist.className}>{children}</div>
}

import { createClient } from '../../../lib/supabase/server'
import { getSettings } from '../../../lib/features/bilar-settings-service'
import InstallningarClient from './InstallningarClient'

export default async function InstallningarPage() {
  const supabase = await createClient()
  const settings = await getSettings(supabase)

  if (!settings) {
    return (
      <p className="text-sm" style={{ color: '#64748B' }}>
        Kunde inte ladda inställningar. Kontrollera att ditt konto har en aktiv organisation.
      </p>
    )
  }

  return <InstallningarClient settings={settings} />
}

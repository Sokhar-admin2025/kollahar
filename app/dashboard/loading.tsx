'use client'

import Header from '../components/organisms/Header'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-brand-beige flex flex-col">
      <Header />
      
      <div className="p-6 relative flex-grow">
        {/* Header-sektion (titel + välkomsttext) */}
        <div id="dashboard-header" className="mx-auto max-w-4xl mb-8">
          <div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-gray-200 rounded animate-pulse" />
        </div>
        
        {/* Toppmenyn (meddelanden, inställningar, logga ut) */}
        <div className="mx-auto max-w-4xl mb-6 flex items-center gap-4 justify-end">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        </div>

        <main className="mx-auto max-w-4xl space-y-6">
          {/* CTA-kort */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
          </div>

          {/* Flikar + länk */}
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex space-x-4">
              <div className="h-8 w-28 bg-gray-200 rounded-t animate-pulse" />
              <div className="h-8 w-36 bg-gray-200 rounded-t animate-pulse" />
              <div className="h-8 w-32 bg-gray-200 rounded-t animate-pulse" />
            </div>
            <div className="hidden md:block h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Innehållsområde - Lista med annonser (matchar "Aktiva annonser"-fliken) */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="group flex gap-4 p-4 border rounded-xl"
                >
                  {/* Bild */}
                  <div className="h-20 w-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden animate-pulse" />
                  
                  {/* Innehåll */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Titel */}
                      <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse flex-1" />
                      {/* Knappar */}
                      <div className="flex gap-2 flex-shrink-0">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {/* Pris */}
                      <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                      {/* Status-badge */}
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}


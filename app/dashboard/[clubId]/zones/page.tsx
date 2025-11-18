'use client'

import { ClubZonesList } from '@/components/club-zones-list'
import { useParams } from 'next/navigation'

export default function ZonesPage() {
    const params = useParams()
    const clubId = params.clubId as string
  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
        <main className="max-w-7xl mx-auto px-4 py-8">
            <ClubZonesList clubId={clubId} />
        </main>
    </div>
  )
}

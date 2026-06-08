const BASE = 'http://localhost:3001/api'

async function test() {
  // Test bidder1 credit data
  const bidder1Res = await fetch(`${BASE}/credit/alerts/list`)
  const bidder1Data = await bidder1Res.json()
  const bidder1 = bidder1Data.data?.lowCreditUsers?.[0]
  const bidder1Id = bidder1?.id
  if (!bidder1Id) { console.log('No low-credit bidder'); return }

  // Also test regular bidder (bidder1 user)
  const usersRes = await fetch(`${BASE}/users`)
  // Try bidder1
  const res = await fetch(`${BASE}/credit/354fa62e-8d1c-4931-b7b7-1867bbe244fd`)
  const data = await res.json()
  const d = data.data
  if (d) {
    console.log('Bidder credit data:')
    console.log('  currentScore:', d.currentScore)
    console.log('  records count:', d.records?.length)
    console.log('  trend count:', d.trend?.length)
    if (d.records?.length > 0) {
      const r = d.records[0]
      console.log('  First record:', r.type, r.score_change, r.reason, r.project, r.created_at?.slice(0, 10))
    }
    if (d.trend?.length > 0) {
      console.log('  Trend sample:', d.trend.slice(-3).map(t => `${t.month}:${t.score}`).join(', '))
    }
  } else {
    console.log('No credit data:', data)
  }
}

test().catch(console.error)

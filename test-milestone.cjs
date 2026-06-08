const BASE = 'http://localhost:3001/api'

async function test() {
  // Test overdue milestones
  const overdueRes = await fetch(`${BASE}/contracts/overdue/milestones`)
  const overdueData = await overdueRes.json()
  const m = overdueData.data?.[0]
  if (!m) {
    console.log('No overdue milestones found')
    return
  }
  console.log('Overdue milestone:', m.id, m.name, m.status)

  // Test milestone update with acceptance
  const updateRes = await fetch(`${BASE}/contracts/milestones/${m.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      actual_date: '2026-06-08',
      acceptanceResult: 'pass',
      acceptanceOpinion: '工程质量合格，符合验收标准',
    }),
  })
  const updateData = await updateRes.json()
  const u = updateData.data
  console.log('Updated milestone:', u.status, u.actual_date, u.acceptance_result, u.acceptance_opinion)

  // Verify by fetching again
  const verifyRes = await fetch(`${BASE}/contracts/${m.contract_id}/milestones`)
  const verifyData = await verifyRes.json()
  const verified = verifyData.data?.find((x) => x.id === m.id)
  console.log('Verified after refresh:', verified?.status, verified?.actual_date, verified?.acceptance_result, verified?.acceptance_opinion)
}

test().catch(console.error)

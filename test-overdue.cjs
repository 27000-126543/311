const BASE = 'http://localhost:3001/api'

async function test() {
  // Get the first project
  const projectsRes = await fetch(`${BASE}/projects`)
  const projectsData = await projectsRes.json()
  const projects = projectsData.data?.list || []
  let project = null
  for (const p of projects) {
    const checkRes = await fetch(`${BASE}/contracts/project/${p.id}`)
    const checkData = await checkRes.json()
    if (checkData.data?.status === 'signed') { project = p; break }
  }
  if (!project) { console.log('No signed contract found'); return }

  const contract = (await (await fetch(`${BASE}/contracts/project/${project.id}`)).json()).data
  console.log('Contract:', contract.id, contract.status)

  // Add an overdue milestone
  const res = await fetch(`${BASE}/contracts/${contract.id}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '主体结构验收', plannedDate: '2025-03-01', paymentAmount: 800000 }),
  })
  const data = await res.json()
  console.log('Added milestone:', data.data?.name, data.data?.status)
}

test().catch(console.error)

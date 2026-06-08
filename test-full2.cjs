const BASE = 'http://localhost:3001/api'

async function test() {
  // Get projects
  const projectsRes = await fetch(`${BASE}/projects`)
  const projectsData = await projectsRes.json()
  const projects = projectsData.data?.list || []
  // Find a project without a contract
  let project = null
  for (const p of projects) {
    const checkRes = await fetch(`${BASE}/contracts/project/${p.id}`)
    const checkData = await checkRes.json()
    if (!checkData.data) { project = p; break }
  }
  if (!project) { console.log('All projects have contracts'); return }
  console.log('Project:', project.id, project.name, 'budget:', project.budget)

  // Create contract
  const contractRes = await fetch(`${BASE}/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.id }),
  })
  const contractData = await contractRes.json()
  const contract = contractData.data
  console.log('Contract:', contract.id, 'amount:', contract.contract_amount, 'deposit:', contract.deposit)

  // Add overdue milestone
  const milestoneRes = await fetch(`${BASE}/contracts/${contract.id}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '基础工程验收', plannedDate: '2025-06-01', paymentAmount: 500000 }),
  })
  const milestone = (await milestoneRes.json()).data
  console.log('Created milestone:', milestone.name, milestone.status)

  // Complete with acceptance
  const updateRes = await fetch(`${BASE}/contracts/milestones/${milestone.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      actual_date: '2026-06-08',
      acceptance_result: 'pass',
      acceptance_opinion: '工程质量合格，符合验收标准',
    }),
  })
  const u = (await updateRes.json()).data
  console.log('After acceptance:', u.status, u.actual_date, u.acceptance_result, u.acceptance_opinion)

  // Verify after refresh
  const verifyRes = await fetch(`${BASE}/contracts/${contract.id}/milestones`)
  const verified = (await verifyRes.json()).data?.find((x) => x.id === milestone.id)
  console.log('After refresh:', verified?.status, verified?.actual_date, verified?.acceptance_result, verified?.acceptance_opinion)

  // Sign
  await fetch(`${BASE}/contracts/${contract.id}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signerName: 'Test', signatureType: 'typed', signatureContent: 'Test', signature: 'Test' }),
  })

  // Amend
  const amendRes = await fetch(`${BASE}/contracts/${contract.id}/amend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Material increase', type: 'amendment', amountChange: 100000, durationChange: 15 }),
  })
  const amendment = (await amendRes.json()).data?.amendments?.[0]
  console.log('Amendment:', amendment?.id, amendment?.status)

  // Tenderer approve
  await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'tenderer', approved: true, comment: 'Agreed' }),
  })

  // Supervisor approve
  const finalRes = await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'supervisor', approved: true, comment: 'Confirmed' }),
  })
  const final = (await finalRes.json()).data
  console.log('Final contract_amount:', final.contract_amount, '(expected:', project.budget + 100000, ')')
  console.log('Final deposit:', final.deposit, '(should be unchanged)')
  console.log('Content has amount adjustment:', final.content?.includes('合同金额调整'))
  console.log('Content has duration summary:', final.content?.includes('累计工期调整'))
}

test().catch(console.error)

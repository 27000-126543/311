const BASE = 'http://localhost:3001/api'

async function test() {
  // Get a project
  const projectsRes = await fetch(`${BASE}/projects`)
  const projectsData = await projectsRes.json()
  const project = projectsData.data?.list?.[0]
  if (!project) { console.log('No project found'); return }
  console.log('Project:', project.id, project.name)

  // Create a contract
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
  const milestoneData = await milestoneRes.json()
  const milestone = milestoneData.data
  console.log('Created milestone:', milestone.id, milestone.name, milestone.status)

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
  const updateData = await updateRes.json()
  const u = updateData.data
  console.log('Updated:', u.status, u.actual_date, u.acceptance_result, u.acceptance_opinion)

  // Verify after refresh
  const verifyRes = await fetch(`${BASE}/contracts/${contract.id}/milestones`)
  const verifyData = await verifyRes.json()
  const verified = verifyData.data?.find((x) => x.id === milestone.id)
  console.log('After refresh:', verified?.status, verified?.actual_date, verified?.acceptance_result, verified?.acceptance_opinion)

  // Sign the contract
  const signRes = await fetch(`${BASE}/contracts/${contract.id}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signerName: 'Test Signer',
      signatureType: 'typed',
      signatureContent: 'TestSigner',
      signature: 'TestSigner',
    }),
  })
  const signData = await signRes.json()
  console.log('Signed contract:', signData.data?.status, 'amount:', signData.data?.contract_amount)

  // Submit amendment
  const amendRes = await fetch(`${BASE}/contracts/${contract.id}/amend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'Material cost increase',
      type: 'amendment',
      amountChange: 100000,
      durationChange: 15,
      documents: [{ id: 'd1', name: 'cost_proof.pdf', size: '1.2 MB' }],
    }),
  })
  const amendData = await amendRes.json()
  const amendment = amendData.data?.amendments?.[0]
  console.log('Amendment:', amendment?.id, amendment?.status, 'amountChange:', amendment?.amountChange)

  // Tenderer approve
  const approve1Res = await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'tenderer', approved: true, comment: 'Agreed' }),
  })
  const approve1Data = await approve1Res.json()
  console.log('After tenderer approve:', approve1Data.data?.amendments?.[0]?.status)

  // Supervisor approve
  const approve2Res = await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'supervisor', approved: true, comment: 'Confirmed' }),
  })
  const approve2Data = await approve2Res.json()
  const finalContract = approve2Data.data
  console.log('After supervisor approve:')
  console.log('  contract_amount:', finalContract?.contract_amount, '(should be project budget + 100000)')
  console.log('  deposit:', finalContract?.deposit, '(should be unchanged)')
  console.log('  content includes 金额调整:', finalContract?.content?.includes('合同金额调整'))
  console.log('  content includes 累计工期:', finalContract?.content?.includes('累计工期调整'))
}

test().catch(console.error)

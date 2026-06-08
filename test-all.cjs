const BASE = 'http://localhost:3001/api'

async function test() {
  console.log('=== 综合测试 ===\n')

  // --- Test 1: Bid interception recording ---
  console.log('--- Test 1: 投标拦截记录 ---')
  const alertsRes = await fetch(`${BASE}/credit/alerts/list`)
  const alertsData = await alertsRes.json()
  const lowCreditUser = alertsData.data?.lowCreditUsers?.[0]
  if (!lowCreditUser) {
    console.log('  SKIP: 没有低信用投标人')
  } else {
    console.log('  低信用投标人:', lowCreditUser.username, 'score:', lowCreditUser.credit_score)

    const activeRestrictions = alertsData.data?.alerts?.filter((a) => a.restricted === 1 && a.bidder_id === lowCreditUser.id)
    if (!activeRestrictions?.length) {
      console.log('  发送预警...')
      await fetch(`${BASE}/credit/alerts/${lowCreditUser.id}/send`, { method: 'POST' })
    }

    const projectsRes = await fetch(`${BASE}/projects`)
    const projects = (await projectsRes.json()).data?.list || []
    const project = projects[0]
    if (project) {
      console.log('  尝试提交投标 (应该被拦截)...')
      const bidRes = await fetch(`${BASE}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, bidderId: lowCreditUser.id, quote: 100000 }),
      })
      console.log('  状态:', bidRes.status, bidRes.status === 403 ? '(正确拦截)' : '(意外)')
      const bidData = await bidRes.json()
      console.log('  错误:', bidData.error?.slice(0, 50))
    }

    const interceptRes = await fetch(`${BASE}/credit/interceptions`)
    const interceptData = await interceptRes.json()
    const interception = interceptData.data?.find((r) => r.bidder_id === lowCreditUser.id && r.type === 'penalty')
    if (interception) {
      console.log('  拦截记录已保存:', interception.reason?.slice(0, 40), 'project:', interception.project_name || interception.project || '—')
    } else {
      console.log('  FAIL: 拦截记录未找到')
    }

    const creditRes = await fetch(`${BASE}/credit/${lowCreditUser.id}`)
    const creditData = await creditRes.json()
    const penaltyRecord = creditData.data?.records?.find((r) => r.reason?.includes('投标被拦截'))
    if (penaltyRecord) {
      console.log('  信用记录中也有拦截:', penaltyRecord.created_at?.slice(0, 10))
    } else {
      console.log('  FAIL: 信用记录中没有拦截记录')
    }
  }

  // --- Test 2: Contract amount base ---
  console.log('\n--- Test 2: 合同金额变更基数 ---')
  const projectsRes2 = await fetch(`${BASE}/projects`)
  const projects2 = (await projectsRes2.json()).data?.list || []
  let testProject = null
  for (const p of projects2) {
    const cRes = await fetch(`${BASE}/contracts/project/${p.id}`)
    const cData = await cRes.json()
    if (!cData.data) { testProject = p; break }
  }
  if (!testProject) {
    console.log('  SKIP: 所有项目都有合同')
  } else {
    console.log('  创建合同, 项目:', testProject.name, 'budget:', testProject.budget)
    const createRes = await fetch(`${BASE}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: testProject.id }),
    })
    const contract = (await createRes.json()).data
    console.log('  合同金额:', contract.contract_amount, '保证金:', contract.deposit)

    await fetch(`${BASE}/contracts/${contract.id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signerName: 'Test', signatureType: 'typed', signatureContent: 'Test', signature: 'Test' }),
    })

    const amendRes = await fetch(`${BASE}/contracts/${contract.id}/amend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Material cost increase', type: 'amendment', amountChange: 200000, durationChange: 10 }),
    })
    const amendData = await amendRes.json()
    const amendment = amendData.data?.amendments?.[amendData.data.amendments.length - 1]

    await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'tenderer', approved: true, comment: 'OK' }),
    })
    const finalRes = await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'supervisor', approved: true, comment: 'OK' }),
    })
    const final = (await finalRes.json()).data
    console.log('  变更后合同金额:', final.contract_amount, '(预期:', testProject.budget + 200000, ')')
    console.log('  保证金不变:', final.deposit, '(预期:', contract.deposit, ')')
    console.log('  合同金额正确:', final.contract_amount === testProject.budget + 200000 ? 'YES' : 'NO')
    console.log('  保证金正确:', final.deposit === contract.deposit ? 'YES' : 'NO')

    // Second amendment
    const amend2Res = await fetch(`${BASE}/contracts/${contract.id}/amend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Scope extension', type: 'amendment', amountChange: 150000, durationChange: 20 }),
    })
    const amend2Data = await amend2Res.json()
    const amendment2 = amend2Data.data?.amendments?.[amend2Data.data.amendments.length - 1]

    await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment2.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'tenderer', approved: true, comment: 'OK' }),
    })
    const final2Res = await fetch(`${BASE}/contracts/${contract.id}/amendments/${amendment2.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'supervisor', approved: true, comment: 'OK' }),
    })
    const final2 = (await final2Res.json()).data
    console.log('  二次变更后金额:', final2.contract_amount, '(预期:', testProject.budget + 200000 + 150000, ')')
    console.log('  二次变更金额正确:', final2.contract_amount === testProject.budget + 200000 + 150000 ? 'YES' : 'NO')
    const contentHasBoth = final2.content?.includes('变更记录 #1') && final2.content?.includes('变更记录 #2')
    console.log('  正文有两次变更记录:', contentHasBoth ? 'YES' : 'NO')
    const contentHasCumulative = final2.content?.includes('累计调整')
    console.log('  正文有累计结果:', contentHasCumulative ? 'YES' : 'NO')
  }

  // --- Test 3: Overdue milestones ---
  console.log('\n--- Test 3: 逾期节点自动识别 ---')
  const overdueRes = await fetch(`${BASE}/contracts/overdue/milestones`)
  const overdueData = await overdueRes.json()
  console.log('  逾期节点数:', overdueData.data?.length || 0)
  if (overdueData.data?.length > 0) {
    const sample = overdueData.data[0]
    console.log('  示例:', sample.name, '状态:', sample.status, '项目:', sample.project_name || '—')
  }

  // Also test that a pending-but-past-due milestone shows up
  const projectsRes3 = await fetch(`${BASE}/projects`)
  const projects3 = (await projectsRes3.json()).data?.list || []
  let signedContract = null
  for (const p of projects3) {
    const cRes = await fetch(`${BASE}/contracts/project/${p.id}`)
    const cData = await cRes.json()
    if (cData.data?.status === 'signed') { signedContract = cData.data; break }
  }
  if (signedContract) {
    // Add a pending milestone with past date
    const addRes = await fetch(`${BASE}/contracts/${signedContract.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '待完成但已过计划日期', plannedDate: '2025-01-15', paymentAmount: 300000 }),
    })
    const added = (await addRes.json()).data
    console.log('  添加待完成节点(过去日期):', added.name, '状态:', added.status)

    // Now check if it shows in overdue list
    const overdue2Res = await fetch(`${BASE}/contracts/overdue/milestones`)
    const overdue2Data = await overdue2Res.json()
    const found = overdue2Data.data?.find((m) => m.id === added.id)
    console.log('  该节点出现在逾期列表:', found ? 'YES' : 'NO')

    // Check in contract milestones too
    const msRes = await fetch(`${BASE}/contracts/${signedContract.id}/milestones`)
    const msData = await msRes.json()
    const inContract = msData.data?.find((m) => m.id === added.id)
    console.log('  合同台账中也显示逾期:', inContract?.status === 'overdue' ? 'YES' : 'NO')
  }

  console.log('\n=== 测试完成 ===')
}

test().catch(console.error)

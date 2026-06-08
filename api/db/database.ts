import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let dbInstance: Database.Database | null = null

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = path.join(__dirname, 'bidding.db')
    dbInstance = new Database(dbPath)
    dbInstance.pragma('journal_mode = WAL')
    dbInstance.pragma('foreign_keys = ON')
    initTables(dbInstance)
    seedData(dbInstance)
  }
  return dbInstance
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('tenderer','bidder','expert','admin','supervisor')),
      org_name TEXT NOT NULL,
      credit_score REAL DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      budget REAL NOT NULL,
      industry TEXT NOT NULL,
      region TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','bidding','evaluating','awarded','contracted','completed','failed')),
      tenderer_id TEXT NOT NULL REFERENCES users(id),
      qualifications TEXT DEFAULT '[]',
      scoring_criteria TEXT DEFAULT '[]',
      description TEXT,
      template_id TEXT,
      announcement_id TEXT,
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      bidder_id TEXT NOT NULL REFERENCES users(id),
      quote REAL NOT NULL,
      documents TEXT DEFAULT '[]',
      key_params TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected','opened','scored')),
      verify_result TEXT,
      reject_reason TEXT,
      encrypted_content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expert_draws (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      specialties TEXT DEFAULT '[]',
      exclude_ids TEXT DEFAULT '[]',
      encrypted_result TEXT,
      decrypt_at TEXT,
      decrypted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      bid_id TEXT NOT NULL REFERENCES bids(id),
      expert_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      scores TEXT DEFAULT '[]',
      total_score REAL DEFAULT 0,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS awards (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      winner_bid_id TEXT NOT NULL REFERENCES bids(id),
      status TEXT DEFAULT 'published' CHECK(status IN ('published','objected','confirmed','revoked')),
      published_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS objections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      submitter_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      evidence TEXT DEFAULT '[]',
      level1_status TEXT DEFAULT 'pending' CHECK(level1_status IN ('pending','approved','rejected')),
      level1_comment TEXT,
      level2_status TEXT DEFAULT 'pending' CHECK(level2_status IN ('pending','approved','rejected')),
      level2_comment TEXT,
      level3_status TEXT DEFAULT 'pending' CHECK(level3_status IN ('pending','approved','rejected')),
      level3_comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      deposit REAL DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','signed','amending','completed')),
      content TEXT,
      signed_at TEXT,
      amendments TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_records (
      id TEXT PRIMARY KEY,
      bidder_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('bid','win','fulfill','breach','objection','penalty')),
      score_change REAL NOT NULL,
      reason TEXT NOT NULL,
      project_id TEXT REFERENCES projects(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_tenderer ON projects(tenderer_id);
    CREATE INDEX IF NOT EXISTS idx_bids_project ON bids(project_id);
    CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_project ON evaluations(project_id);
    CREATE INDEX IF NOT EXISTS idx_credit_records_bidder ON credit_records(bidder_id);
  `)
}

function seedData(db: Database.Database): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) return

  const insert = db.transaction(() => {
    const now = new Date().toISOString()

    const userIds: Record<string, string> = {
      tenderer1: uuidv4(),
      bidder1: uuidv4(),
      expert1: uuidv4(),
      admin1: uuidv4(),
      supervisor1: uuidv4(),
    }

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password, role, org_name, credit_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    insertUser.run(userIds.tenderer1, 'tenderer1', '123456', 'tenderer', '华北建设集团', 100, now)
    insertUser.run(userIds.bidder1, 'bidder1', '123456', 'bidder', '华东科技有限公司', 85, now)
    insertUser.run(userIds.expert1, 'expert1', '123456', 'expert', '工程技术研究院', 100, now)
    insertUser.run(userIds.admin1, 'admin1', '123456', 'admin', '招标管理中心', 100, now)
    insertUser.run(userIds.supervisor1, 'supervisor1', '123456', 'supervisor', '政府采购监管局', 100, now)

    const projectIds: string[] = []
    const insertProject = db.prepare(`
      INSERT INTO projects (id, name, budget, industry, region, status, tenderer_id, qualifications, scoring_criteria, description, deadline, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const projects = [
      {
        name: '华北新区综合办公楼建设工程',
        budget: 5800000,
        industry: '建筑工程',
        region: '华北',
        status: 'published',
        qualifications: ['建筑工程施工总承包壹级', '安全生产许可证'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '技术方案', weight: 40 },
          { criteriaId: 'sc2', name: '商务报价', weight: 30 },
          { criteriaId: 'sc3', name: '企业业绩', weight: 20 },
          { criteriaId: 'sc4', name: '项目团队', weight: 10 },
        ],
        description: '华北新区综合办公楼建设项目，总建筑面积约12000平方米，地上8层，地下1层',
        deadline: '2026-07-15T23:59:59Z',
      },
      {
        name: '智慧城市大数据平台建设项目',
        budget: 3200000,
        industry: '信息技术',
        region: '华东',
        status: 'bidding',
        qualifications: ['计算机信息系统集成壹级', 'CMMI3级及以上认证'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '技术方案', weight: 45 },
          { criteriaId: 'sc2', name: '商务报价', weight: 25 },
          { criteriaId: 'sc3', name: '实施案例', weight: 20 },
          { criteriaId: 'sc4', name: '售后服务', weight: 10 },
        ],
        description: '建设智慧城市大数据平台，包含数据采集、清洗、存储、分析和可视化展示等模块',
        deadline: '2026-06-30T23:59:59Z',
      },
      {
        name: '社区医疗卫生服务中心装修工程',
        budget: 1500000,
        industry: '医疗卫生',
        region: '华南',
        status: 'evaluating',
        qualifications: ['建筑装修装饰工程专业承包壹级', '医疗器械经营许可证'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '设计方案', weight: 35 },
          { criteriaId: 'sc2', name: '商务报价', weight: 35 },
          { criteriaId: 'sc3', name: '施工经验', weight: 20 },
          { criteriaId: 'sc4', name: '工期保障', weight: 10 },
        ],
        description: '社区医疗卫生服务中心内部装修工程，包含诊疗区、检验区、药房等功能区域',
        deadline: '2026-06-20T23:59:59Z',
      },
      {
        name: '职业培训数字化教学平台采购项目',
        budget: 980000,
        industry: '教育培训',
        region: '西南',
        status: 'awarded',
        qualifications: ['软件企业认定', 'ISO9001质量管理体系认证'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '平台功能', weight: 40 },
          { criteriaId: 'sc2', name: '商务报价', weight: 30 },
          { criteriaId: 'sc3', name: '服务能力', weight: 20 },
          { criteriaId: 'sc4', name: '用户口碑', weight: 10 },
        ],
        description: '采购职业培训数字化教学平台，支持在线课程、直播教学、考试评测等功能',
        deadline: '2026-05-31T23:59:59Z',
      },
      {
        name: '城际轨道交通信号系统升级项目',
        budget: 12000000,
        industry: '交通运输',
        region: '华东',
        status: 'contracted',
        qualifications: ['铁路电气化工程专业承包壹级', '信号系统安全认证'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '技术方案', weight: 40 },
          { criteriaId: 'sc2', name: '商务报价', weight: 25 },
          { criteriaId: 'sc3', name: '安全认证', weight: 20 },
          { criteriaId: 'sc4', name: '实施能力', weight: 15 },
        ],
        description: '城际轨道交通信号系统全面升级改造，实现CBTC信号系统替换',
        deadline: '2026-04-30T23:59:59Z',
      },
      {
        name: '光伏发电站EPC总承包项目',
        budget: 8500000,
        industry: '能源环保',
        region: '西北',
        status: 'completed',
        qualifications: ['电力工程施工总承包壹级', '承装（修、试）电力设施许可证'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '技术方案', weight: 35 },
          { criteriaId: 'sc2', name: '商务报价', weight: 30 },
          { criteriaId: 'sc3', name: '施工经验', weight: 20 },
          { criteriaId: 'sc4', name: '运维方案', weight: 15 },
        ],
        description: '50MW光伏发电站EPC总承包，含设计、采购、施工和调试',
        deadline: '2026-03-31T23:59:59Z',
      },
      {
        name: '市政道路改扩建及配套工程',
        budget: 4200000,
        industry: '建筑工程',
        region: '西南',
        status: 'draft',
        qualifications: ['市政公用工程施工总承包壹级'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '施工方案', weight: 40 },
          { criteriaId: 'sc2', name: '商务报价', weight: 30 },
          { criteriaId: 'sc3', name: '工期计划', weight: 15 },
          { criteriaId: 'sc4', name: '安全措施', weight: 15 },
        ],
        description: '市政道路改扩建工程，全长3.5公里，含排水、照明、绿化等配套工程',
        deadline: '2026-08-31T23:59:59Z',
      },
      {
        name: '医院信息化管理系统升级项目',
        budget: 2100000,
        industry: '信息技术',
        region: '华北',
        status: 'failed',
        qualifications: ['计算机信息系统集成贰级及以上', '信息安全等级保护备案'],
        scoringCriteria: [
          { criteriaId: 'sc1', name: '系统功能', weight: 40 },
          { criteriaId: 'sc2', name: '商务报价', weight: 25 },
          { criteriaId: 'sc3', name: '数据安全', weight: 20 },
          { criteriaId: 'sc4', name: '培训服务', weight: 15 },
        ],
        description: '医院HIS/LIS/PACS系统全面升级改造，实现互联互通标准化',
        deadline: '2026-05-15T23:59:59Z',
      },
    ]

    for (const p of projects) {
      const id = uuidv4()
      projectIds.push(id)
      insertProject.run(
        id,
        p.name,
        p.budget,
        p.industry,
        p.region,
        p.status,
        userIds.tenderer1,
        JSON.stringify(p.qualifications),
        JSON.stringify(p.scoringCriteria),
        p.description,
        p.deadline,
        now,
      )
    }

    const bidIds: string[] = []
    const insertBid = db.prepare(`
      INSERT INTO bids (id, project_id, bidder_id, quote, documents, key_params, status, verify_result, reject_reason, encrypted_content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const bids = [
      { projectIdx: 0, quote: 5650000, status: 'verified', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 0, quote: 5500000, status: 'pending', verifyResult: null },
      { projectIdx: 0, quote: 5900000, status: 'rejected', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: false, creditScore: 62 }), rejectReason: '业绩不满足要求' },
      { projectIdx: 1, quote: 3100000, status: 'opened', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 1, quote: 3050000, status: 'opened', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 1, quote: 3200000, status: 'verified', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 2, quote: 1450000, status: 'scored', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 2, quote: 1480000, status: 'scored', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 2, quote: 1520000, status: 'scored', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 3, quote: 950000, status: 'scored', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 3, quote: 970000, status: 'scored', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 4, quote: 11800000, status: 'verified', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 4, quote: 11650000, status: 'verified', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 5, quote: 8350000, status: 'verified', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 5, quote: 8420000, status: 'verified', verifyResult: JSON.stringify({ licenseValid: true, performanceMatch: true, creditScore: 85 }) },
      { projectIdx: 5, quote: 8280000, status: 'rejected', verifyResult: JSON.stringify({ licenseValid: false, performanceMatch: true, creditScore: 85 }), rejectReason: '资质证书已过期' },
    ]

    for (const b of bids) {
      const id = uuidv4()
      bidIds.push(id)
      insertBid.run(
        id,
        projectIds[b.projectIdx],
        userIds.bidder1,
        b.quote,
        JSON.stringify([{ name: '投标文件.pdf', size: 2048000 }]),
        JSON.stringify({ 工期: '180天', 质量标准: '合格', 项目经理: '张工' }),
        b.status,
        b.verifyResult,
        b.rejectReason || null,
        b.encrypted_content || null,
        now,
      )
    }

    const drawIds: string[] = []
    const insertDraw = db.prepare(`
      INSERT INTO expert_draws (id, project_id, specialties, exclude_ids, encrypted_result, decrypt_at, decrypted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const draws = [
      {
        projectIdx: 2,
        specialties: ['建筑装饰', '医疗设施'],
        decrypted: 1,
        decryptAt: '2026-06-18T09:00:00Z',
      },
      {
        projectIdx: 3,
        specialties: ['软件开发', '教育技术'],
        decrypted: 1,
        decryptAt: '2026-05-28T09:00:00Z',
      },
      {
        projectIdx: 1,
        specialties: ['大数据', '云计算'],
        decrypted: 0,
        decryptAt: '2026-06-28T09:00:00Z',
      },
      {
        projectIdx: 0,
        specialties: ['建筑工程', '结构设计'],
        decrypted: 0,
        decryptAt: '2026-07-12T09:00:00Z',
      },
      {
        projectIdx: 4,
        specialties: ['轨道交通', '信号系统'],
        decrypted: 0,
        decryptAt: '2026-04-28T09:00:00Z',
      },
    ]

    for (const d of draws) {
      const id = uuidv4()
      drawIds.push(id)
      const experts = d.decrypted
        ? JSON.stringify([{ id: userIds.expert1, name: 'expert1', specialty: d.specialties[0] }])
        : Buffer.from(JSON.stringify([{ id: userIds.expert1, name: 'expert1', specialty: d.specialties[0] }])).toString('base64')
      insertDraw.run(
        id,
        projectIds[d.projectIdx],
        JSON.stringify(d.specialties),
        JSON.stringify([]),
        experts,
        d.decryptAt,
        d.decrypted,
        now,
      )
    }

    const insertEvaluation = db.prepare(`
      INSERT INTO evaluations (id, bid_id, expert_id, project_id, scores, total_score, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const evals = [
      { bidIdx: 6, totalScore: 88.5, comment: '方案合理，经验丰富' },
      { bidIdx: 7, totalScore: 82.3, comment: '方案基本满足要求' },
      { bidIdx: 8, totalScore: 76.8, comment: '方案有待优化' },
      { bidIdx: 9, totalScore: 91.2, comment: '方案优秀，性价比高' },
      { bidIdx: 10, totalScore: 79.5, comment: '方案一般' },
      { bidIdx: 6, totalScore: 90.0, comment: '技术方案突出' },
      { bidIdx: 7, totalScore: 85.1, comment: '方案可行' },
      { bidIdx: 8, totalScore: 74.2, comment: '细节需完善' },
      { bidIdx: 9, totalScore: 89.7, comment: '平台功能完善' },
      { bidIdx: 10, totalScore: 77.8, comment: '部分功能待改进' },
      { bidIdx: 3, totalScore: 86.3, comment: '综合方案较好' },
      { bidIdx: 4, totalScore: 84.1, comment: '技术方案有亮点' },
    ]

    for (const e of evals) {
      insertEvaluation.run(
        uuidv4(),
        bidIds[e.bidIdx],
        userIds.expert1,
        projectIds[bids[e.bidIdx].projectIdx],
        JSON.stringify([
          { criteriaId: 'sc1', score: 35, maxScore: 40 },
          { criteriaId: 'sc2', score: 28, maxScore: 30 },
          { criteriaId: 'sc3', score: 17, maxScore: 20 },
          { criteriaId: 'sc4', score: 8.5, maxScore: 10 },
        ]),
        e.totalScore,
        e.comment,
        now,
      )
    }

    const insertAward = db.prepare(`
      INSERT INTO awards (id, project_id, winner_bid_id, status, published_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    insertAward.run(uuidv4(), projectIds[3], bidIds[9], 'confirmed', now)
    insertAward.run(uuidv4(), projectIds[5], bidIds[13], 'published', now)
    insertAward.run(uuidv4(), projectIds[4], bidIds[11], 'objected', now)

    const insertObjection = db.prepare(`
      INSERT INTO objections (id, project_id, submitter_id, content, evidence, level1_status, level1_comment, level2_status, level2_comment, level3_status, level3_comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertObjection.run(
      uuidv4(),
      projectIds[4],
      userIds.bidder1,
      '对评标结果有异议，认为评标过程存在不公平现象，技术评分标准执行不统一',
      JSON.stringify([{ name: '异议证据材料.pdf', size: 1024000 }]),
      'approved',
      '异议理由成立，转交中心处理',
      'pending',
      null,
      'pending',
      null,
      now,
      now,
    )
    insertObjection.run(
      uuidv4(),
      projectIds[5],
      userIds.bidder1,
      '对中标候选人资质提出质疑，其资质证书有效期不符合招标文件要求',
      JSON.stringify([{ name: '资质对比分析.pdf', size: 512000 }]),
      'rejected',
      '经核实，资质证书在有效期内',
      'pending',
      null,
      'pending',
      null,
      now,
      now,
    )

    const insertContract = db.prepare(`
      INSERT INTO contracts (id, project_id, deposit, status, content, signed_at, amendments, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertContract.run(
      uuidv4(),
      projectIds[3],
      50000,
      'signed',
      '职业培训数字化教学平台采购合同，合同金额98万元，工期120天',
      now,
      JSON.stringify([]),
      now,
    )
    insertContract.run(
      uuidv4(),
      projectIds[5],
      420000,
      'completed',
      '光伏发电站EPC总承包合同，合同金额835万元',
      now,
      JSON.stringify([{ reason: '增加防雷接地工程', date: now }]),
      now,
    )

    const insertCredit = db.prepare(`
      INSERT INTO credit_records (id, bidder_id, type, score_change, reason, project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const creditRecords = [
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 0 },
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 1 },
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 2 },
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 3 },
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 4 },
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 5 },
      { type: 'win', scoreChange: 5, reason: '中标项目', projectIdx: 3 },
      { type: 'win', scoreChange: 5, reason: '中标项目', projectIdx: 5 },
      { type: 'fulfill', scoreChange: 3, reason: '按期完成合同履约', projectIdx: 5 },
      { type: 'fulfill', scoreChange: 3, reason: '质量验收合格', projectIdx: 5 },
      { type: 'breach', scoreChange: -10, reason: '投标文件造假', projectIdx: 0 },
      { type: 'penalty', scoreChange: -5, reason: '无故撤回投标', projectIdx: 7 },
      { type: 'penalty', scoreChange: -8, reason: '围标串标嫌疑', projectIdx: 1 },
      { type: 'objection', scoreChange: -3, reason: '异议被驳回', projectIdx: 5 },
      { type: 'bid', scoreChange: 2, reason: '投标方案优秀', projectIdx: 2 },
      { type: 'fulfill', scoreChange: 2, reason: '提前完成项目', projectIdx: 3 },
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 6 },
      { type: 'bid', scoreChange: 1, reason: '按时提交投标文件', projectIdx: 7 },
      { type: 'penalty', scoreChange: -5, reason: '投标保证金未按时缴纳', projectIdx: 4 },
      { type: 'win', scoreChange: 5, reason: '中标项目', projectIdx: 4 },
      { type: 'fulfill', scoreChange: 3, reason: '合同履约评价优秀', projectIdx: 3 },
      { type: 'breach', scoreChange: -15, reason: '严重违约行为', projectIdx: 7 },
    ]

    for (const c of creditRecords) {
      insertCredit.run(
        uuidv4(),
        userIds.bidder1,
        c.type,
        c.scoreChange,
        c.reason,
        projectIds[c.projectIdx],
        now,
      )
    }
  })

  insert()
}

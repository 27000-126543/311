export type UserRole = 'tenderer' | 'bidder' | 'expert' | 'admin' | 'supervisor'

export type User = {
  id: string
  username: string
  role: UserRole
  orgName: string
  creditScore: number
  createdAt: string
}

export type ProjectStatus = 'draft' | 'published' | 'bidding' | 'evaluating' | 'awarded' | 'contracted' | 'completed' | 'failed'

export type ScoringCriteria = {
  id: string
  name: string
  weight: number
  maxScore: number
  description: string
}

export type Project = {
  id: string
  name: string
  budget: number
  industry: string
  region: string
  status: ProjectStatus
  tendererId: string
  qualifications: string[]
  scoringCriteria: ScoringCriteria[]
  description: string
  templateId: string
  announcementId: string
  deadline: string
  createdAt: string
  bidCount?: number
  tendererName?: string
}

export type BidStatus = 'pending' | 'verified' | 'rejected' | 'opened' | 'scored'

export type FileInfo = {
  name: string
  type: string
  size: number
  url: string
}

export type Bid = {
  id: string
  projectId: string
  bidderId: string
  quote: number
  documents: FileInfo[]
  keyParams: Record<string, string>
  status: BidStatus
  verifyResult?: VerifyResult
  rejectReason?: string
  bidderName?: string
  totalScore?: number
  rank?: number
}

export type ExpertDraw = {
  id: string
  projectId: string
  specialties: string[]
  excludeIds: string[]
  encryptedResult: string
  decryptAt: string
  decrypted: boolean
  experts?: Pick<User, 'id' | 'username' | 'orgName'>[]
  createdAt: string
}

export type Evaluation = {
  id: string
  bidId: string
  expertId: string
  projectId: string
  scores: { criteriaId: string; score: number }[]
  totalScore: number
  comment?: string
  expertName?: string
}

export type AwardStatus = 'published' | 'objected' | 'confirmed' | 'revoked'

export type Award = {
  id: string
  projectId: string
  winnerBidId: string
  status: AwardStatus
  winnerName?: string
  winnerQuote?: number
  publishedAt: string
}

export type ObjectionLevelStatus = 'pending' | 'approved' | 'rejected'

export type Objection = {
  id: string
  projectId: string
  submitterId: string
  content: string
  evidence: FileInfo[]
  level1Status: ObjectionLevelStatus
  level1Comment?: string
  level2Status: ObjectionLevelStatus
  level2Comment?: string
  level3Status: ObjectionLevelStatus
  level3Comment?: string
  submitterName?: string
  createdAt: string
  updatedAt: string
}

export type ContractStatus = 'draft' | 'signed' | 'amending' | 'completed'

export type Amendment = {
  reason: string
  documents: FileInfo[]
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export type Contract = {
  id: string
  projectId: string
  deposit: number
  status: ContractStatus
  content?: string
  signedAt?: string
  amendments: Amendment[]
  createdAt: string
}

export type CreditRecordType = 'bid' | 'win' | 'fulfill' | 'breach' | 'objection' | 'penalty'

export type CreditRecord = {
  id: string
  bidderId: string
  type: CreditRecordType
  scoreChange: number
  reason: string
  projectId?: string
  createdAt: string
}

export type CreditAlert = {
  id: string
  bidderId: string
  bidderName: string
  creditScore: number
  threshold: number
  message: string
  createdAt: string
}

export type DashboardData = {
  todayTransactions: number
  totalAmount: number
  failedRate: number
  expertUsageRate: number
  creditDistribution: { region: string; avgScore: number }[]
  recentProjects: Project[]
  monthlyTrend: { month: string; transactions: number; amount: number }[]
}

export type Template = {
  id: string
  name: string
  industry: string
  matchScore: number
  description: string
}

export type VerifyResult = {
  passed: boolean
  checks: { name: string; passed: boolean; message: string }[]
}

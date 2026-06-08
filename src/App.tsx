import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import ProjectList from '@/pages/ProjectList'
import ProjectCreate from '@/pages/ProjectCreate'
import ProjectDetail from '@/pages/ProjectDetail'
import BidList from '@/pages/BidList'
import BidSubmit from '@/pages/BidSubmit'
import BidVerify from '@/pages/BidVerify'
import ExpertDraw from '@/pages/ExpertDraw'
import BidOpening from '@/pages/BidOpening'
import Evaluation from '@/pages/Evaluation'
import EvaluationList from '@/pages/EvaluationList'
import Award from '@/pages/Award'
import ObjectionPage from '@/pages/ObjectionPage'
import ObjectionList from '@/pages/ObjectionList'
import Contract from '@/pages/Contract'
import Credit from '@/pages/Credit'
import RestrictionList from '@/pages/RestrictionList'
import OverdueMilestones from '@/pages/OverdueMilestones'
import Analytics from '@/pages/Analytics'

function ProtectedLayout({ roles }: { roles?: string[] }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/create" element={<ProtectedRoute roles={['tenderer', 'admin']}><ProjectCreate /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/bids" element={<ProtectedRoute roles={['bidder']}><BidList /></ProtectedRoute>} />
          <Route path="/bids/submit/:projectId" element={<ProtectedRoute roles={['bidder']}><BidSubmit /></ProtectedRoute>} />
          <Route path="/bids/verify/:id" element={<BidVerify />} />
          <Route path="/experts" element={<ProtectedRoute roles={['admin']}><ExpertDraw /></ProtectedRoute>} />
          <Route path="/bid-opening/:projectId" element={<BidOpening />} />
          <Route path="/evaluation/:projectId" element={<ProtectedRoute roles={['expert', 'admin']}><Evaluation /></ProtectedRoute>} />
          <Route path="/evaluation/_list" element={<ProtectedRoute roles={['expert', 'admin']}><EvaluationList /></ProtectedRoute>} />
          <Route path="/awards/:projectId" element={<Award />} />
          <Route path="/objections/:projectId" element={<ObjectionPage />} />
          <Route path="/objections/_list" element={<ProtectedRoute roles={['admin', 'supervisor']}><ObjectionList /></ProtectedRoute>} />
          <Route path="/contracts/:projectId" element={<Contract />} />
          <Route path="/credit" element={<ProtectedRoute roles={['bidder', 'admin', 'supervisor']}><Credit /></ProtectedRoute>} />
          <Route path="/restrictions" element={<ProtectedRoute roles={['admin', 'supervisor']}><RestrictionList /></ProtectedRoute>} />
          <Route path="/overdue-milestones" element={<ProtectedRoute roles={['admin', 'supervisor']}><OverdueMilestones /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute roles={['admin', 'supervisor']}><Analytics /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  )
}

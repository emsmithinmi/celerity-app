import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Daily from './pages/Daily'
import Tasks from './pages/Tasks'
import Projects from './pages/Projects'
import People from './pages/People'
import Habits from './pages/Habits'
import Reviews from './pages/Reviews'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/daily" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="daily" element={<Daily />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="projects" element={<Projects />} />
          <Route path="people" element={<People />} />
          <Route path="habits" element={<Habits />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="reviews/:type" element={<Reviews />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

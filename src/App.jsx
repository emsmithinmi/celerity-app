import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { EnergyLevelsProvider } from './contexts/EnergyLevelsContext'
import { PrioritiesProvider }   from './contexts/PrioritiesContext'
import { AreasProvider }        from './contexts/AreasContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Daily from './pages/Daily'
import Tasks from './pages/Tasks'
import TaskPage from './pages/TaskPage'
import Projects from './pages/Projects'
import ProjectPage from './pages/ProjectPage'
import People from './pages/People'
import PersonPage from './pages/PersonPage'
import Habits from './pages/Habits'
import HabitPage from './pages/HabitPage'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <EnergyLevelsProvider>
      <PrioritiesProvider>
      <AreasProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/daily" replace />} />
              <Route path="daily"         element={<Daily />} />
              <Route path="tasks"         element={<Tasks />} />
              <Route path="tasks/:id"     element={<TaskPage />} />
              <Route path="projects"      element={<Projects />} />
              <Route path="projects/:id"  element={<ProjectPage />} />
              <Route path="people"        element={<People />} />
              <Route path="people/:id"    element={<PersonPage />} />
              <Route path="habits"        element={<Habits />} />
              <Route path="habits/:habit" element={<HabitPage />} />
              <Route path="reviews"       element={<Reviews />} />
              <Route path="reviews/:type" element={<Reviews />} />
              <Route path="settings"      element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AreasProvider>
      </PrioritiesProvider>
      </EnergyLevelsProvider>
    </AuthProvider>
  )
}

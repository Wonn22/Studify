import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './auth/Login'
import Register from './auth/Register'
import Dashboard from './views/DashboardPage'
import ProfilePage from './views/ProfilePage'
import BrowseSessions from './views/BrowseSessionsPage'
import MessagesPage from './views/MessagesPage'
import FindPage from './views/FindPage'
import GroupsPage from './views/GroupsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/browse-sessions" element={<BrowseSessions />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/match" element={<FindPage />} />
        <Route path="/groups" element={<GroupsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

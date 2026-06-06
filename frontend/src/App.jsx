import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import Login from './auth/Login'
import Register from './auth/Register'
import RequireAuth from './auth/RequireAuth'
import Dashboard from './views/DashboardPage'
import ProfilePage from './views/ProfilePage'
import BrowseSessions from './views/BrowseSessionsPage'
import MessagesPage from './views/MessagesPage'
import FindPage from './views/FindPage'
import GroupsPage from './views/GroupsPage'
import ProjectWorkspace from './views/ProjectWorkspace'
import ConnectionsPage from './views/ConnectionsPage'

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/browse-sessions" element={<BrowseSessions />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/match" element={<FindPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<ProjectWorkspace />} />
            <Route path="/connections" element={<ConnectionsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  )
}

export default App

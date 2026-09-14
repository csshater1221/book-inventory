import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import { useLibrary } from './library/useLibrary.js'
import LoginPage from './pages/LoginPage.jsx'
import ScanPage from './pages/ScanPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'

export default function App() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return <p className="scan-hint centered">Loading…</p>
  }

  if (!user) {
    return <LoginPage />
  }

  return <SignedInApp user={user} logout={logout} />
}

function SignedInApp({ user, logout }) {
  const { books, loading: booksLoading } = useLibrary(user.uid)

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">readr</span>
        <button className="link-button" onClick={logout}>
          Sign out
        </button>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="/scan" element={<ScanPage books={books} />} />
          <Route path="/library" element={<LibraryPage books={books} loading={booksLoading} />} />
        </Routes>
      </main>

      <nav className="tab-bar">
        <NavLink to="/scan" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Scan
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Library {booksLoading ? '' : `(${books.length})`}
        </NavLink>
      </nav>
    </div>
  )
}

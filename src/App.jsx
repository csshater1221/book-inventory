import { useMemo } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import { useLibrary, isOwned, isWishlist } from './library/useLibrary.js'
import LoginPage from './pages/LoginPage.jsx'
import ScanPage from './pages/ScanPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import { useOnlineStatus } from './offline/useOnlineStatus.js'

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
  const { books, loading: booksLoading, pendingCount } = useLibrary(user.uid)
  const online = useOnlineStatus()

  const ownedCount = useMemo(() => books.filter(isOwned).length, [books])
  const wishlistCount = useMemo(() => books.filter(isWishlist).length, [books])

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">shelfQ</span>
        <button className="link-button" onClick={logout}>
          Sign out
        </button>
      </header>

      {!online && (
        <div className="status-banner offline" role="status">
          Offline — showing your saved library. Changes will sync when you reconnect.
        </div>
      )}
      {online && pendingCount > 0 && (
        <div className="status-banner syncing" role="status">
          Syncing {pendingCount} {pendingCount === 1 ? 'change' : 'changes'}…
        </div>
      )}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="/scan" element={<ScanPage books={books} loading={booksLoading} />} />
          <Route path="/library" element={<LibraryPage books={books} loading={booksLoading} />} />
          <Route path="/wishlist" element={<WishlistPage books={books} loading={booksLoading} />} />
        </Routes>
      </main>

      <nav className="tab-bar">
        <NavLink to="/scan" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Scan
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Library {booksLoading ? '' : `(${ownedCount})`}
        </NavLink>
        <NavLink to="/wishlist" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          Wishlist {booksLoading ? '' : `(${wishlistCount})`}
        </NavLink>
      </nav>
    </div>
  )
}

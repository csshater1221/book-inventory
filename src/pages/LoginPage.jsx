import { useAuth } from '../auth/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="login-page">
      <h1>Book Inventory</h1>
      <p>Scan the books you own so you don't buy the same one twice.</p>
      <button className="primary" onClick={login}>
        Sign in with Google
      </button>
    </div>
  )
}

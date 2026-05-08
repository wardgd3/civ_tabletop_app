import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function SetupProfile() {
  const { session, fetchProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase
        .from('wg_profiles')
        .insert({ id: session.user.id, display_name: displayName })
      if (error) throw error
      await fetchProfile(session.user.id)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0d1117' }}>
      <div className="w-full max-w-md p-8 rounded-xl shadow-2xl" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-wide" style={{ color: '#c9d1d9' }}>Set Up Profile</h1>
        <p className="mb-8 text-sm" style={{ color: '#6e7681' }}>Choose your display name to get started</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#1a0d0d', border: '1px solid #3d1a1a', color: '#f47067' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#8b949e' }}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }}
              placeholder="WarLord42"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#1a3a5c', color: '#79c0ff', border: '1px solid #2a5a8c' }}
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

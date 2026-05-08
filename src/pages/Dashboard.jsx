import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import FriendsPanel from '../components/FriendsPanel'
import GameLobby from '../components/GameLobby'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('games')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117' }}>
      <header className="sticky top-0 z-10" style={{ backgroundColor: '#161b22', borderBottom: '1px solid #2a3140' }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wide" style={{ color: '#c9d1d9' }}>War Game</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none" style={{ color: '#8b949e' }}>
              {profile?.display_name}
              <span className="ml-1 sm:ml-2 font-mono" style={{ color: '#4a5568' }}>ELO {profile?.elo_rating}</span>
            </span>
            <button
              onClick={signOut}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm transition-colors whitespace-nowrap"
              style={{ color: '#6e7681' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex gap-1 mb-4 sm:mb-6">
          <button
            onClick={() => setTab('games')}
            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium rounded transition-colors"
            style={tab === 'games'
              ? { backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }
              : { backgroundColor: '#161b22', color: '#6e7681', border: '1px solid #2a3140' }}
          >
            Games
          </button>
          <button
            onClick={() => setTab('friends')}
            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium rounded transition-colors"
            style={tab === 'friends'
              ? { backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }
              : { backgroundColor: '#161b22', color: '#6e7681', border: '1px solid #2a3140' }}
          >
            Friends
          </button>
        </div>

        {tab === 'games' ? <GameLobby /> : <FriendsPanel />}
      </div>
    </div>
  )
}

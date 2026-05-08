import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import FriendsPanel from '../components/FriendsPanel'
import GameLobby from '../components/GameLobby'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('games')

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">War Game</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm">
              {profile?.display_name}
              <span className="ml-2 text-gray-500">ELO {profile?.elo_rating}</span>
            </span>
            <button
              onClick={signOut}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setTab('games')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'games'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'friends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Friends
          </button>
        </div>

        {tab === 'games' ? <GameLobby /> : <FriendsPanel />}
      </div>
    </div>
  )
}

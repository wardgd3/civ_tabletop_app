import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import FriendsPanel from '../components/FriendsPanel'
import GameLobby from '../components/GameLobby'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('games')

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-white">War Game</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
              {profile?.display_name}
              <span className="ml-1 sm:ml-2 text-gray-500">ELO {profile?.elo_rating}</span>
            </span>
            <button
              onClick={signOut}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
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
            className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'games'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-colors ${
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

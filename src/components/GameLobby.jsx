import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGames } from '../hooks/useGames'
import { useFriends } from '../hooks/useFriends'

export default function GameLobby() {
  const { games, invites, loading, createGame, inviteToGame, acceptInvite, declineInvite, startGame } = useGames()
  const { friends } = useFriends()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [gameName, setGameName] = useState('')
  const [creating, setCreating] = useState(false)
  const [invitingGameId, setInvitingGameId] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!gameName.trim()) return
    setCreating(true)
    try {
      await createGame(gameName.trim())
      setGameName('')
      setShowCreate(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="text-gray-400">Loading games...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Games</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Game'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            placeholder="Game name..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create
          </button>
        </form>
      )}

      {invites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">Game Invites</h3>
          <ul className="space-y-2">
            {invites.map(inv => (
              <li key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <div className="min-w-0">
                  <span className="text-white font-medium truncate block">{inv.game?.name}</span>
                  <span className="text-gray-400 text-sm">from {inv.inviter?.display_name}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => acceptInvite(inv)} className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
                    Join
                  </button>
                  <button onClick={() => declineInvite(inv.id)} className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg">
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {games.length === 0 ? (
          <p className="text-gray-400 text-sm">No games yet. Create one to get started!</p>
        ) : (
          games.map(game => (
            <div key={game.id} className="p-3 sm:p-4 bg-gray-700/50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className="text-white font-semibold text-base sm:text-lg truncate block">{game.name}</span>
                  <span className={`inline-block mt-1 sm:mt-0 sm:ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                    game.status === 'lobby' ? 'bg-yellow-600/30 text-yellow-400' :
                    game.status === 'active' ? 'bg-green-600/30 text-green-400' :
                    'bg-gray-600/30 text-gray-400'
                  }`}>
                    {game.status}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {game.status === 'active' && (
                    <button
                      onClick={() => navigate(`/game/${game.id}`)}
                      className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Play
                    </button>
                  )}
                  {game.status === 'lobby' && game.host_id === game.players?.[0]?.player_id && (
                    <>
                      <button
                        onClick={() => setInvitingGameId(invitingGameId === game.id ? null : game.id)}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                      >
                        Invite
                      </button>
                      <button
                        onClick={() => startGame(game.id)}
                        disabled={game.players?.length < 2}
                        className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Start
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {game.players?.map(p => (
                  <span
                    key={p.player_id}
                    className="text-sm px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: p.color + '40', borderColor: p.color, borderWidth: 1 }}
                  >
                    {p.wg_profiles?.display_name}
                  </span>
                ))}
              </div>

              {invitingGameId === game.id && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">Invite a friend:</p>
                  {friends.length === 0 ? (
                    <p className="text-gray-400 text-sm">Add friends first to invite them.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {friends.map(friend => (
                        <button
                          key={friend.id}
                          onClick={async () => {
                            try {
                              await inviteToGame(game.id, friend.id)
                              setInvitingGameId(null)
                            } catch (err) {
                              alert(err.message)
                            }
                          }}
                          className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-sm rounded-lg transition-colors"
                        >
                          {friend.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

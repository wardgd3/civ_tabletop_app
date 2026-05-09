import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGames } from '../hooks/useGames'
import { useFriends } from '../hooks/useFriends'

const MAP_SIZES = [
  { id: 'small',    label: 'Small',       rows: 24, cols: 36 },
  { id: 'standard', label: 'Standard',    rows: 32, cols: 48 },
  { id: 'large',    label: 'Large',       rows: 48, cols: 72 },
  { id: 'xlarge',   label: 'Extra Large', rows: 64, cols: 96 },
  { id: 'huge',     label: 'Huge',        rows: 96, cols: 144 },
]

export default function GameLobby() {
  const { games, invites, loading, createGame, createAdminGame, inviteToGame, acceptInvite, declineInvite, startGame, deleteGame, updatePlayerColor, updatePlayerSpace } = useGames()
  const { friends } = useFriends()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [gameName, setGameName] = useState('')
  const [creating, setCreating] = useState(false)
  const [invitingGameId, setInvitingGameId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showAdminSize, setShowAdminSize] = useState(false)
  const [adminMapSize, setAdminMapSize] = useState('standard')
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

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

  if (loading) return <div style={{ color: '#6e7681' }}>Loading games...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: '#c9d1d9' }}>Games</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdminSize(!showAdminSize)}
            className="px-4 py-2 text-sm font-medium rounded transition-colors"
            style={{ backgroundColor: '#2a1a2a', color: '#c080c0', border: '1px solid #3d2a3d' }}
          >
            Admin
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 text-sm font-medium rounded transition-colors"
            style={showCreate
              ? { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }
              : { backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
          >
            {showCreate ? 'Cancel' : 'New Game'}
          </button>
        </div>
      </div>

      {showAdminSize && (
        <div className="p-3 rounded space-y-2" style={{ backgroundColor: '#161b22', border: '1px solid #3d2a3d' }}>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#c080c0' }}>Admin — Select Map Size</div>
          <div className="flex flex-wrap gap-1.5">
            {MAP_SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => setAdminMapSize(s.id)}
                className="px-2.5 py-1.5 text-xs rounded transition-colors"
                style={adminMapSize === s.id
                  ? { backgroundColor: '#3d2a3d', color: '#c080c0', border: '1px solid #5a3a5a' }
                  : { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
              >
                {s.label}
                <span className="text-[9px] ml-1 opacity-50">{s.cols}x{s.rows}</span>
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              try {
                const size = MAP_SIZES.find(s => s.id === adminMapSize) || MAP_SIZES[1]
                const g = await createAdminGame(size.rows, size.cols)
                setShowAdminSize(false)
                navigate(`/game/${g.id}`)
              } catch (err) {
                alert(err.message)
              }
            }}
            className="w-full py-1.5 text-xs font-medium rounded transition-colors"
            style={{ backgroundColor: '#3d2a3d', color: '#c080c0', border: '1px solid #5a3a5a' }}
          >
            Create Admin Game
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            placeholder="Game name..."
            className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/50"
            style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }}
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
          >
            Create
          </button>
        </form>
      )}

      {invites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: '#8b949e' }}>Game Invites</h3>
          <ul className="space-y-2">
            {invites.map(inv => (
              <li key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <div className="min-w-0">
                  <span className="font-medium truncate block" style={{ color: '#c9d1d9' }}>{inv.game?.name}</span>
                  <span className="text-sm" style={{ color: '#6e7681' }}>from {inv.inviter?.display_name}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => acceptInvite(inv)}
                    className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-sm rounded transition-colors"
                    style={{ backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
                  >
                    Join
                  </button>
                  <button
                    onClick={() => declineInvite(inv.id)}
                    className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-sm rounded transition-colors"
                    style={{ backgroundColor: '#21262d', color: '#6e7681', border: '1px solid #30363d' }}
                  >
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
          <p className="text-sm" style={{ color: '#6e7681' }}>No games yet. Create one to get started!</p>
        ) : (
          games.map(game => (
            <div key={game.id} className="p-3 sm:p-4 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className="font-semibold text-base sm:text-lg truncate block" style={{ color: '#c9d1d9' }}>{game.name}</span>
                  <span
                    className="inline-block mt-1 sm:mt-0 sm:ml-3 text-[10px] font-semibold font-mono uppercase tracking-widest px-2 py-0.5 rounded"
                    style={
                      game.status === 'lobby' ? { backgroundColor: '#1e2a1e', color: '#7a9a7a', border: '1px solid #2e3e2e' } :
                      game.status === 'active' ? { backgroundColor: '#1a2535', color: '#5a9abf', border: '1px solid #2a3a50' } :
                      { backgroundColor: '#21262d', color: '#4a5568', border: '1px solid #30363d' }
                    }
                  >
                    {game.status}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  {game.status === 'active' && (
                    <button
                      onClick={() => navigate(`/game/${game.id}`)}
                      className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-sm font-medium rounded transition-colors"
                      style={{ backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
                    >
                      Play
                    </button>
                  )}
                  {game.status === 'lobby' && game.host_id === game.players?.[0]?.player_id && (
                    <>
                      <button
                        onClick={() => setInvitingGameId(invitingGameId === game.id ? null : game.id)}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm rounded transition-colors"
                        style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                      >
                        Invite
                      </button>
                      <button
                        onClick={() => startGame(game.id)}
                        disabled={game.players?.length < 2}
                        className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-40"
                        style={{ backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
                      >
                        Start
                      </button>
                    </>
                  )}
                  <div className="relative" ref={menuOpenId === game.id ? menuRef : null}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === game.id ? null : game.id)}
                      className="p-1.5 rounded transition-colors hover:bg-white/10"
                      style={{ color: '#6e7681' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                      </svg>
                    </button>
                    {menuOpenId === game.id && (
                      <div
                        className="absolute right-0 top-full mt-1 py-1 rounded shadow-lg z-50 min-w-[120px]"
                        style={{ backgroundColor: '#1c2128', border: '1px solid #30363d' }}
                      >
                        <button
                          onClick={() => { setMenuOpenId(null); setConfirmDeleteId(game.id) }}
                          className="w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
                          style={{ color: '#f85149' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {game.players?.map((p, i) => {
                  const tagColors = [
                    { bg: '#15253a', color: '#5a9abf', border: '#1e3550' },
                    { bg: '#2a1a1a', color: '#b07070', border: '#3a2a2a' },
                    { bg: '#1a2a1e', color: '#6a9a72', border: '#2a3a2e' },
                    { bg: '#2a2518', color: '#b0953a', border: '#3a3528' },
                  ]
                  const tc = tagColors[i % tagColors.length]
                  return (
                    <span
                      key={p.player_id}
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ backgroundColor: tc.bg, border: `1px solid ${tc.border}`, color: tc.color }}
                    >
                      {p.wg_profiles?.display_name}
                    </span>
                  )
                })}
              </div>

              {confirmDeleteId === game.id && (
                <div className="mt-3 p-3 rounded flex items-center justify-between" style={{ backgroundColor: '#1a0a0a', border: '1px solid #3a2020' }}>
                  <span className="text-sm" style={{ color: '#f85149' }}>Delete this game? This cannot be undone.</span>
                  <div className="flex gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1 text-sm rounded transition-colors"
                      style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteGame(game.id)
                          setConfirmDeleteId(null)
                        } catch (err) {
                          alert(err.message)
                        }
                      }}
                      className="px-3 py-1 text-sm rounded transition-colors"
                      style={{ backgroundColor: '#3a1515', color: '#f85149', border: '1px solid #5a2020' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {invitingGameId === game.id && (
                <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
                  <p className="text-sm mb-2" style={{ color: '#8b949e' }}>Invite a friend:</p>
                  {friends.length === 0 ? (
                    <p className="text-sm" style={{ color: '#6e7681' }}>Add friends first to invite them.</p>
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
                          className="px-3 py-1 text-sm rounded transition-colors"
                          style={{ backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
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

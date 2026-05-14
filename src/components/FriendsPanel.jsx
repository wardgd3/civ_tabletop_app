import { useState } from 'react'
import { useFriends } from '../hooks/useFriends'

export default function FriendsPanel() {
  const {
    friends, pendingReceived, pendingSent, loading,
    sendRequest, acceptRequest, declineRequest, removeFriend,
  } = useFriends()

  const [searchName, setSearchName] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function handleSendRequest(e) {
    e.preventDefault()
    if (!searchName.trim()) return
    setError(null)
    setSending(true)
    try {
      await sendRequest(searchName.trim())
      setSearchName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div style={{ color: '#6e7681' }}>Loading friends...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3" style={{ color: '#c9d1d9' }}>Add Friend</h3>
        <form onSubmit={handleSendRequest} className="flex gap-2">
          <input
            type="text"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="Enter display name..."
            className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/50"
            style={{ backgroundColor: '#111214', border: '1px solid #30363d', color: '#c9d1d9' }}
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
          >
            {sending ? '...' : 'Add'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm" style={{ color: '#f47067' }}>{error}</p>}
      </div>

      {pendingReceived.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: '#c9d1d9' }}>
            Friend Requests ({pendingReceived.length})
          </h3>
          <ul className="space-y-2">
            {pendingReceived.map(req => (
              <li key={req.friendshipId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                <div className="min-w-0">
                  <span className="font-medium" style={{ color: '#c9d1d9' }}>{req.display_name}</span>
                  <span className="ml-2 text-sm font-mono" style={{ color: '#4a5568' }}>ELO {req.elo_rating}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => acceptRequest(req.friendshipId)}
                    className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-sm rounded transition-colors"
                    style={{ backgroundColor: '#1c3043', color: '#6cb4e6', border: '1px solid #264a6a' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineRequest(req.friendshipId)}
                    className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-sm rounded transition-colors"
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

      {pendingSent.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: '#c9d1d9' }}>Sent Requests</h3>
          <ul className="space-y-2">
            {pendingSent.map(req => (
              <li key={req.friendshipId} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                <span style={{ color: '#c9d1d9' }}>{req.display_name}</span>
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#5a9abf' }}>Pending</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3" style={{ color: '#c9d1d9' }}>
          Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <p className="text-sm" style={{ color: '#6e7681' }}>No friends yet. Add someone by their display name!</p>
        ) : (
          <ul className="space-y-2">
            {friends.map(friend => (
              <li key={friend.friendshipId} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                <div>
                  <span className="font-medium" style={{ color: '#c9d1d9' }}>{friend.display_name}</span>
                  <span className="ml-2 text-sm font-mono" style={{ color: '#4a5568' }}>ELO {friend.elo_rating}</span>
                </div>
                <button
                  onClick={() => removeFriend(friend.friendshipId)}
                  className="px-3 py-1 text-sm rounded transition-colors"
                  style={{ backgroundColor: '#2a1a1a', color: '#a06060', border: '1px solid #3a2525' }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

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
    return <div className="text-gray-400">Loading friends...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Add Friend</h3>
        <form onSubmit={handleSendRequest} className="flex gap-2">
          <input
            type="text"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="Enter display name..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? '...' : 'Add'}
          </button>
        </form>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {pendingReceived.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Friend Requests ({pendingReceived.length})
          </h3>
          <ul className="space-y-2">
            {pendingReceived.map(req => (
              <li key={req.friendshipId} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <span className="text-white font-medium">{req.display_name}</span>
                  <span className="ml-2 text-gray-400 text-sm">ELO {req.elo_rating}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(req.friendshipId)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineRequest(req.friendshipId)}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
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
          <h3 className="text-lg font-semibold text-white mb-3">Sent Requests</h3>
          <ul className="space-y-2">
            {pendingSent.map(req => (
              <li key={req.friendshipId} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-white">{req.display_name}</span>
                <span className="text-gray-400 text-sm">Pending</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <p className="text-gray-400 text-sm">No friends yet. Add someone by their display name!</p>
        ) : (
          <ul className="space-y-2">
            {friends.map(friend => (
              <li key={friend.friendshipId} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <span className="text-white font-medium">{friend.display_name}</span>
                  <span className="ml-2 text-gray-400 text-sm">ELO {friend.elo_rating}</span>
                </div>
                <button
                  onClick={() => removeFriend(friend.friendshipId)}
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors"
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

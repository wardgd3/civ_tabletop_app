import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useFriends() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [friends, setFriends] = useState([])
  const [pendingReceived, setPendingReceived] = useState([])
  const [pendingSent, setPendingSent] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFriends = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('wg_friendships')
      .select(`
        id, status, requester_id, addressee_id,
        requester:wg_profiles!wg_friendships_requester_id_fkey(id, display_name, avatar_url, elo_rating),
        addressee:wg_profiles!wg_friendships_addressee_id_fkey(id, display_name, avatar_url, elo_rating)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    if (error) {
      console.error('Error fetching friends:', error)
      setLoading(false)
      return
    }

    const accepted = []
    const received = []
    const sent = []

    for (const row of data) {
      const otherProfile = row.requester_id === userId ? row.addressee : row.requester

      if (row.status === 'accepted') {
        accepted.push({ friendshipId: row.id, ...otherProfile })
      } else if (row.status === 'pending') {
        if (row.addressee_id === userId) {
          received.push({ friendshipId: row.id, ...row.requester })
        } else {
          sent.push({ friendshipId: row.id, ...row.addressee })
        }
      }
    }

    setFriends(accepted)
    setPendingReceived(received)
    setPendingSent(sent)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  async function sendRequest(displayName) {
    const { data: targetProfile, error: lookupError } = await supabase
      .from('wg_profiles')
      .select('id')
      .eq('display_name', displayName)
      .single()

    if (lookupError || !targetProfile) {
      throw new Error('Player not found')
    }

    if (targetProfile.id === userId) {
      throw new Error("You can't add yourself")
    }

    const { error } = await supabase
      .from('wg_friendships')
      .insert({ requester_id: userId, addressee_id: targetProfile.id })

    if (error) {
      if (error.code === '23505') throw new Error('Friend request already exists')
      throw error
    }

    await fetchFriends()
  }

  async function acceptRequest(friendshipId) {
    const { error } = await supabase
      .from('wg_friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)

    if (error) throw error
    await fetchFriends()
  }

  async function declineRequest(friendshipId) {
    const { error } = await supabase
      .from('wg_friendships')
      .update({ status: 'declined' })
      .eq('id', friendshipId)

    if (error) throw error
    await fetchFriends()
  }

  async function removeFriend(friendshipId) {
    const { error } = await supabase
      .from('wg_friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) throw error
    await fetchFriends()
  }

  return {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    refresh: fetchFriends,
  }
}

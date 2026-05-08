import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'
import GameBoard from '../components/GameBoard'

export default function Game() {
  const { id } = useParams()
  const navigate = useNavigate()
  const gameState = useGameState(id)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        try { await screen.orientation?.lock?.('landscape') } catch {}
      } else {
        await document.exitFullscreen()
        try { screen.orientation?.unlock?.() } catch {}
      }
    } catch {}
  }, [])

  if (gameState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0d1117' }}>
        <div className="text-slate-500 text-lg font-mono uppercase tracking-widest">Loading...</div>
      </div>
    )
  }

  if (!gameState.game) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0d1117' }}>
        <div className="text-center">
          <div className="text-slate-500 text-lg mb-4">Game not found</div>
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 transition-colors text-sm uppercase tracking-wide">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col p-2 sm:p-4 pb-16 lg:pb-4 overflow-hidden" style={{ backgroundColor: '#0d1117' }}>
      {!isFullscreen && (
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-500 hover:text-slate-300 transition-colors text-sm cursor-pointer"
            >
              &larr; Back
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-200 uppercase tracking-wide truncate">{gameState.game.name}</h1>
          </div>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
          >
            Fullscreen
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <GameBoard
          game={gameState.game}
          players={gameState.players}
          units={gameState.units}
          unitTypes={gameState.unitTypes}
          tiles={gameState.tiles}
          discoveredTiles={gameState.discoveredTiles}
          persistDiscoveredTiles={gameState.persistDiscoveredTiles}
          currentPlayer={gameState.currentPlayer}
          isMyTurn={gameState.isMyTurn}
          deployUnit={gameState.deployUnit}
          moveUnit={gameState.moveUnit}
          attackUnit={gameState.attackUnit}
          buildRoad={gameState.buildRoad}
          destroyRoad={gameState.destroyRoad}
          endTurn={gameState.endTurn}
          isAdmin={gameState.isAdmin}
          isFullscreen={isFullscreen}
          onExitFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  )
}

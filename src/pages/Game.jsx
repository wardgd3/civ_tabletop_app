import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'
import GameBoard from '../components/GameBoard'

export default function Game() {
  const { id } = useParams()
  const navigate = useNavigate()
  const gameState = useGameState(id)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeBoard, setActiveBoard] = useState('ground')

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    if (gameState.loading || !gameState.game) return
    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window
    if (isMobile && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        try { screen.orientation?.lock?.('landscape') } catch {}
      }).catch(() => {})
    }
  }, [gameState.loading, gameState.game])

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

  const isSpaceGeneral = !!gameState.currentPlayer?.is_space_general
  const myColor = gameState.currentPlayer?.color
  const teammates = gameState.players.filter(p => p.color === myColor)
  const isSoloTeam = teammates.length <= 1
  const canActOnBoard = gameState.isAdmin || isSoloTeam || (activeBoard === 'space' ? isSpaceGeneral : !isSpaceGeneral)

  const boardTiles = gameState.tiles.filter(t => (t.board || 'ground') === activeBoard)
  const boardUnits = gameState.units.filter(u => (u.board || 'ground') === activeBoard)
  const boardUnitTypes = gameState.unitTypes.filter(ut => (ut.board || 'ground') === activeBoard)

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isFullscreen ? 'p-0' : 'p-2 sm:p-4 pb-16 lg:pb-4'}`} style={{ backgroundColor: '#0d1117' }}>
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
          <div className="flex items-center gap-2">
            <div className="flex rounded overflow-hidden" style={{ border: '1px solid #30363d' }}>
              <button
                onClick={() => setActiveBoard('ground')}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                style={activeBoard === 'ground'
                  ? { backgroundColor: '#1c3043', color: '#6cb4e6' }
                  : { backgroundColor: '#21262d', color: '#4a5568' }}
              >
                Ground
              </button>
              <button
                onClick={() => setActiveBoard('space')}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                style={activeBoard === 'space'
                  ? { backgroundColor: '#2a1a3a', color: '#c080e0' }
                  : { backgroundColor: '#21262d', color: '#4a5568' }}
              >
                Space
              </button>
            </div>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
              style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
            >
              Fullscreen
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <GameBoard
          game={gameState.game}
          players={gameState.players}
          units={boardUnits}
          allUnits={gameState.units}
          unitTypes={boardUnitTypes}
          allUnitTypes={gameState.unitTypes}
          tiles={boardTiles}
          discoveredTiles={gameState.discoveredTiles}
          persistDiscoveredTiles={gameState.persistDiscoveredTiles}
          currentPlayer={gameState.currentPlayer}
          isMyTurn={gameState.isMyTurn && canActOnBoard}
          deployUnit={gameState.deployUnit}
          moveUnit={gameState.moveUnit}
          attackUnit={gameState.attackUnit}
          buildRoad={gameState.buildRoad}
          destroyRoad={gameState.destroyRoad}
          endTurn={gameState.endTurn}
          excavate={gameState.excavate}
          upgradeShipCompartment={gameState.upgradeShipCompartment}
          levelUpUnit={gameState.levelUpUnit}
          buyMissile={gameState.buyMissile}
          fireMissile={gameState.fireMissile}
          produceWarhead={gameState.produceWarhead}
          missileFiredShips={gameState.missileFiredShips}
          sendConvoyToGuild={gameState.sendConvoyToGuild}
          buildConvoy={gameState.buildConvoy}
          loadUnitToConvoy={gameState.loadUnitToConvoy}
          loadFromBayToConvoy={gameState.loadFromBayToConvoy}
          unloadToHoldingBay={gameState.unloadToHoldingBay}
          sendConvoy={gameState.sendConvoy}
          deployFromBay={gameState.deployFromBay}
          produceUnitToBay={gameState.produceUnitToBay}
          loadCargoToConvoy={gameState.loadCargoToConvoy}
          unloadCargoFromConvoy={gameState.unloadCargoFromConvoy}
          dockTransport={gameState.dockTransport}
          loadSoldierToTransport={gameState.loadSoldierToTransport}
          loadBaySoldierToTransport={gameState.loadBaySoldierToTransport}
          unloadSoldierFromTransport={gameState.unloadSoldierFromTransport}
          undockTransport={gameState.undockTransport}
          deployFromTransport={gameState.deployFromTransport}
          buyAndLoadToTransport={gameState.buyAndLoadToTransport}
          boardSoldierToTransport={gameState.boardSoldierToTransport}
          setAutoPath={gameState.setAutoPath}
          clearAutoPath={gameState.clearAutoPath}
          deployFromHangar={gameState.deployFromHangar}
          produceUnitToHangar={gameState.produceUnitToHangar}
          transferHangarUnit={gameState.transferHangarUnit}
          transferAllHangar={gameState.transferAllHangar}
          addToHangar={gameState.addToHangar}
          battleLog={gameState.battleLog}
          isAdmin={gameState.isAdmin}
          productionPerTurn={gameState.productionPerTurn}
          economy={gameState.economy}
          isFullscreen={isFullscreen}
          onExitFullscreen={toggleFullscreen}
          activeBoard={activeBoard}
          setActiveBoard={setActiveBoard}
          canActOnBoard={canActOnBoard}
          allPlayers={gameState.players}
          realIsMyTurn={gameState.isMyTurn}
        />
      </div>
    </div>
  )
}

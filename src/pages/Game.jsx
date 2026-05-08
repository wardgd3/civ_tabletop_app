import { useParams, useNavigate } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'
import GameBoard from '../components/GameBoard'

export default function Game() {
  const { id } = useParams()
  const navigate = useNavigate()
  const gameState = useGameState(id)

  if (gameState.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-400 text-lg">Loading game...</div>
      </div>
    )
  }

  if (!gameState.game) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-4">Game not found</div>
          <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-2 sm:p-4 pb-16 lg:pb-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            &larr; Back
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-white truncate">{gameState.game.name}</h1>
        </div>
      </div>

      <GameBoard
        game={gameState.game}
        players={gameState.players}
        units={gameState.units}
        unitTypes={gameState.unitTypes}
        currentPlayer={gameState.currentPlayer}
        isMyTurn={gameState.isMyTurn}
        deployUnit={gameState.deployUnit}
        moveUnit={gameState.moveUnit}
        attackUnit={gameState.attackUnit}
        endTurn={gameState.endTurn}
      />
    </div>
  )
}

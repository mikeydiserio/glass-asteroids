import React from 'react';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart }) => {
  return (
    <div id="game-over-screen" className="screen">
      <h1 className="title">GAME OVER</h1>
      <p className="subtitle">
        Your score: <span id="final-score">{score}</span>
      </p>
      <button id="restart-button" onClick={onRestart}>
        PLAY AGAIN
      </button>
    </div>
  );
};

export default GameOverScreen;
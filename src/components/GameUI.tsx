import React from 'react';

interface GameUIProps {
  score: number;
  lives: number;
}

const GameUI: React.FC<GameUIProps> = ({ score, lives }) => {
  return (
    <div id="ui-overlay">
      <div className="score-display">
        SCORE: <span id="score">{score}</span>
      </div>
      <div className="score-display">
        LIVES: <span id="lives">{lives}</span>
      </div>
    </div>
  );
};

export default GameUI;
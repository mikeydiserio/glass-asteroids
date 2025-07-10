import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div id="start-screen" className="screen">
      <h1 className="title">GLASS ASTEROIDS</h1>
      <p className="subtitle">Use arrow keys to move, space to shoot</p>
      <button id="start-button" onClick={onStart}>
        START GAME
      </button>
    </div>
  );
};

export default StartScreen;
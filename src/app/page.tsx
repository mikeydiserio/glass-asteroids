'use client';

import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import GameOverScreen from '../components/GameOverScreen';
import GameUI from '../components/GameUI';
import StartScreen from '../components/StartScreen';
// --- TYPE DEFINITIONS ---
interface Velocity { x: number; y: number; }
interface Ship { x: number; y: number; radius: number; angle: number; rotation: number; thrusting: boolean; thrustPower: number; maxSpeed: number; velocity: Velocity; friction: number; invincible: boolean; invincibleTimer: number; }
interface Bullet { x: number; y: number; velocity: Velocity; lifetime: number; }
interface Asteroid { x: number; y: number; size: number; velocity: Velocity; rotation: number; rotationAngle: number; vertices: number; offsets: number[]; hue: number; }
interface Particle { x: number; y: number; velocity: Velocity; radius: number; color: string; lifetime: number; }
interface Keys { ArrowUp: boolean; ArrowLeft: boolean; ArrowRight: boolean; Space: boolean; }
interface GameLogic { ship: Ship | null; bullets: Bullet[]; asteroids: Asteroid[]; particles: Particle[]; keys: Keys; canvas: HTMLCanvasElement | null; ctx: CanvasRenderingContext2D | null; }
type GameState = 'start' | 'playing' | 'gameOver';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(null);

  const gameLogic = useRef<GameLogic>({
    ship: null,
    bullets: [],
    asteroids: [],
    particles: [],
    keys: {
      ArrowUp: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false,
    },
    canvas: null,
    ctx: null,
  });

const createAsteroid = useCallback(() => {
    const game = gameLogic.current;
    if (!game.canvas) return;

    const size = Math.random() * 30 + 20;
    let x, y;

    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -size : game.canvas.width + size;
      y = Math.random() * game.canvas.height;
    } else {
      x = Math.random() * game.canvas.width;
      y = Math.random() < 0.5 ? -size : game.canvas.height + size;
    }

    const speed = Math.random() * 1.5 + 0.5; // Slowed down
    const angle = Math.random() * Math.PI * 2;

    game.asteroids.push({
      x, y, size,
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      rotation: Math.random() * 0.02 - 0.01,
      rotationAngle: 0,
      vertices: Math.floor(Math.random() * 3) + 5,
      offsets: Array.from({ length: 7 }, () => Math.random() * 0.4 + 0.8),
      hue: Math.random() * 360, // Give each asteroid a base color
    });
  }, []);


const startGame = useCallback(() => {
  const game = gameLogic.current;
    if (!game.canvas) return;
    
    game.ship = {
      x: game.canvas.width / 2,
      y: game.canvas.height / 2,
      radius: 15,
      angle: -Math.PI / 2,
      rotation: 0,
      thrusting: false,
      thrustPower: 0.07, // Slowed down
      maxSpeed: 4, // Slowed down
      velocity: { x: 0, y: 0 },
      friction: 0.985, // Slightly less friction
      invincible: true,
      invincibleTimer: 180,
    };
    
    game.bullets = [];
    game.asteroids = [];
    game.particles = [];
    for (let i = 0; i < 5; i++) {
      createAsteroid();
    }
    setScore(0);
    setLives(3);
    setGameState('playing');
}, [createAsteroid, setScore, setLives, setGameState, gameLogic]);
  
  const gameOver = useCallback(() => {
    setGameState('gameOver');
    if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
    }
  }, [setGameState]);
  
  
  
  const createParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const game = gameLogic.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4; // Slightly faster particles for more pop
      const hue = Math.random() * 360;

      game.particles.push({
        x, y,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        radius: Math.random() * 3 + 1,
        color: `hsl(${hue}, 100%, 70%)`,
        lifetime: Math.random() * 40 + 40, // Last longer
      });
    }
  }, []);

  const updateShip = () => {
    const game = gameLogic.current;
    const { ship, keys, canvas } = game;
    if (!ship || !canvas) return;
    
    if (keys.ArrowLeft) ship.rotation = -0.05;
    else if (keys.ArrowRight) ship.rotation = 0.05;
    else ship.rotation = 0;

    ship.angle += ship.rotation;
    ship.thrusting = keys.ArrowUp;

    if (ship.thrusting) {
        ship.velocity.x += Math.cos(ship.angle) * ship.thrustPower;
        ship.velocity.y += Math.sin(ship.angle) * ship.thrustPower;
        
        const speed = Math.sqrt(ship.velocity.x * ship.velocity.x + ship.velocity.y * ship.velocity.y);
        if (speed > ship.maxSpeed) {
            ship.velocity.x = (ship.velocity.x / speed) * ship.maxSpeed;
            ship.velocity.y = (ship.velocity.y / speed) * ship.maxSpeed;
        }
    }

    ship.velocity.x *= ship.friction;
    ship.velocity.y *= ship.friction;

    ship.x += ship.velocity.x;
    ship.y += ship.velocity.y;

    if (ship.x < 0) ship.x = canvas.width;
    if (ship.x > canvas.width) ship.x = 0;
    if (ship.y < 0) ship.y = canvas.height;
    if (ship.y > canvas.height) ship.y = 0;

    if (ship.invincible) {
        ship.invincibleTimer--;
        if (ship.invincibleTimer <= 0) {
            ship.invincible = false;
        }
    }

    if (keys.Space && game.bullets.length < 10) {
        const bulletSpeed = 7;
        game.bullets.push({
            x: ship.x + Math.cos(ship.angle) * ship.radius,
            y: ship.y + Math.sin(ship.angle) * ship.radius,
            velocity: {
                x: Math.cos(ship.angle) * bulletSpeed + ship.velocity.x,
                y: Math.sin(ship.angle) * bulletSpeed + ship.velocity.y,
            },
            lifetime: 100,
        });
        keys.Space = false;
    }
  };

  const drawShip = () => {
    const game = gameLogic.current;
    const { ctx, ship } = game;
    if (!ctx || !ship) return;
    
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    
    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.7);
    ctx.lineTo(-ship.radius * 0.4, 0);
    ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.7);
    ctx.closePath();

    if (ship.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    } else {
        ctx.strokeStyle = 'white';
    }
    
    ctx.lineWidth = 2;
    ctx.stroke();

    if (ship.thrusting) {
        ctx.beginPath();
        ctx.moveTo(-ship.radius * 0.4, 0);
        ctx.lineTo(-ship.radius * 1.2, 0);
        ctx.lineTo(-ship.radius * 0.4, -ship.radius * 0.3);
        ctx.lineTo(-ship.radius * 0.4, ship.radius * 0.3);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 100, 50, 0.7)';
        ctx.fill();
    }
    ctx.restore();
  };
  
  const updateBullets = () => {
    const game = gameLogic.current;
    if (!game.canvas) return;

    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;

        if (bullet.x < 0) bullet.x = game.canvas.width;
        if (bullet.x > game.canvas.width) bullet.x = 0;
        if (bullet.y < 0) bullet.y = game.canvas.height;
        if (bullet.y > game.canvas.height) bullet.y = 0;

        bullet.lifetime--;
        if (bullet.lifetime <= 0) {
            game.bullets.splice(i, 1);
        }
    }
  };

 const drawBullets = () => {
    const game = gameLogic.current;
    if (!game.ctx) return;
    
    for (const bullet of game.bullets) {
        game.ctx.fillStyle = '#f0f'; // Bright magenta
        game.ctx.shadowColor = '#f0f';
        game.ctx.shadowBlur = 15;
        game.ctx.beginPath();
        game.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        game.ctx.fill();
        game.ctx.shadowBlur = 0; // Reset for other elements
    }
  };

  const updateAsteroids = useCallback(() => {
    const game = gameLogic.current;
    if (!game.canvas) return;

    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];
        asteroid.x += asteroid.velocity.x;
        asteroid.y += asteroid.velocity.y;

        if (asteroid.x < -asteroid.size) asteroid.x = game.canvas.width + asteroid.size;
        if (asteroid.x > game.canvas.width + asteroid.size) asteroid.x = -asteroid.size;
        if (asteroid.y < -asteroid.size) asteroid.y = game.canvas.height + asteroid.size;
        if (asteroid.y > game.canvas.height + asteroid.size) asteroid.y = -asteroid.size;

        asteroid.rotationAngle += asteroid.rotation;
    }
    
    if (game.asteroids.length < 10 && Math.random() < 0.01) {
        createAsteroid();
    }
  }, [createAsteroid]);

  const drawAsteroids = () => {
    const game = gameLogic.current;
    if (!game.ctx) return;
    
    for (const asteroid of game.asteroids) {
        game.ctx.save();
        game.ctx.translate(asteroid.x, asteroid.y);
        game.ctx.rotate(asteroid.rotationAngle);
        game.ctx.beginPath();
        
        for (let i = 0; i < asteroid.vertices; i++) {
            const angle = (i / asteroid.vertices) * Math.PI * 2;
            const radius = asteroid.size * asteroid.offsets[i];
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                game.ctx.moveTo(x, y);
            } else {
                game.ctx.lineTo(x, y);
            }
        }
        
        game.ctx.closePath();
        game.ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        game.ctx.lineWidth = 1.5;
        game.ctx.stroke();
        game.ctx.restore();
    }
  };

  const updateParticles = () => {
    const game = gameLogic.current;
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const particle = game.particles[i];
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        particle.velocity.x *= 0.98;
        particle.velocity.y *= 0.98;
        particle.lifetime--;
        
        if (particle.lifetime <= 0) {
            game.particles.splice(i, 1);
        }
    }
  };

  const drawParticles = () => {
    const game = gameLogic.current;
    if (!game.ctx) return;
    
    for (const particle of game.particles) {
        game.ctx.beginPath();
        game.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        game.ctx.fillStyle = particle.color;
        game.ctx.fill();
    }
  };

  const checkCollisions = useCallback(() => {
    const game = gameLogic.current;
    if (!game.ship || !game.canvas) return;

    // Bullets vs Asteroids
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const bullet = game.bullets[i];
      for (let j = game.asteroids.length - 1; j >= 0; j--) {
        const asteroid = game.asteroids[j];
        const dx = bullet.x - asteroid.x;
        const dy = bullet.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < asteroid.size) {
          setScore((prev) => prev + Math.floor(100 - asteroid.size));
          createParticles(asteroid.x, asteroid.y, 'rgba(255, 200, 100, 0.8)', 15);

          if (asteroid.size > 20) {
            for (let k = 0; k < 2; k++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 2 + 1;
              game.asteroids.push({
                x: asteroid.x,
                y: asteroid.y,
                size: asteroid.size * 0.7,
                velocity: {
                  x: Math.cos(angle) * speed,
                  y: Math.sin(angle) * speed,
                },
                rotation: Math.random() * 0.02 - 0.01,
                rotationAngle: 0,
                vertices: Math.floor(Math.random() * 3) + 5,
                offsets: Array.from({ length: 7 }, () => Math.random() * 0.4 + 0.8),
                hue: 0
              });
            }
          }
          game.bullets.splice(i, 1);
          game.asteroids.splice(j, 1);
          break;
        }
      }
    }

    // Ship vs Asteroids
    if (!game.ship.invincible) {
      for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];
        const dx = game.ship.x - asteroid.x;
        const dy = game.ship.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < game.ship.radius + asteroid.size) {
          setLives((prev) => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              gameOver();
              return 0;
            }
            return newLives;
          });

          createParticles(game.ship.x, game.ship.y, 'rgba(255, 50, 50, 0.8)', 20);
          game.ship.invincible = true;
          game.ship.invincibleTimer = 120;
          game.ship.x = game.canvas.width / 2;
          game.ship.y = game.canvas.height / 2;
          game.ship.velocity = { x: 0, y: 0 };
          game.ship.angle = -Math.PI / 2;
          game.asteroids.splice(i, 1);
          break;
        }
      }
    }
  }, [setScore, setLives, createParticles, gameOver]);

    
  const gameLoop = useCallback(() => {
    const game = gameLogic.current;
    if (!game.ctx || !game.canvas) return;

    game.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

    updateShip();
    updateBullets();
    updateAsteroids();
    updateParticles();

    checkCollisions();

    drawShip();
    drawBullets();
    drawAsteroids();
    drawParticles();

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [checkCollisions, updateAsteroids]);
  

  useEffect(() => {
    const game = gameLogic.current;
    if (canvasRef.current) {
        game.canvas = canvasRef.current;
        game.ctx = game.canvas.getContext('2d');
        game.canvas.width = 800;
        game.canvas.height = 600;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code in game.keys) {
        game.keys[e.code as keyof Keys] = true;
        e.preventDefault();
      }
      if (e.code === 'Space' && gameState === 'start') {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in game.keys) {
        game.keys[e.code as keyof Keys] = false;
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (gameState === 'playing') {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop, startGame]);

  return (
    <div>
      <Head>
        <title>Glass Asteroids</title>
        <meta name="description" content="A modern take on the classic Asteroids game." />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#302b63" />
      </Head>

      <div id="game-container">
        <canvas ref={canvasRef} id="game-canvas"></canvas>
        {gameState === 'playing' && <GameUI score={score} lives={lives} />}
        {gameState === 'start' && <StartScreen onStart={startGame} />}
        {gameState === 'gameOver' && <GameOverScreen score={score} onRestart={startGame} />}
      </div>
    </div>
  );
}
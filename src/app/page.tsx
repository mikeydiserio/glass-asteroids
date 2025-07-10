'use client';

import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import GameOverScreen from '../components/GameOverScreen';
import GameUI from '../components/GameUI';
import StartScreen from '../components/StartScreen';

// --- TYPE DEFINITIONS ---
interface Velocity { x: number; y: number; }
interface Ship { x: number; y: number; radius: number; angle: number; rotation: number; thrusting: boolean; thrustPower: number; maxSpeed: number; velocity: Velocity; friction: number; invincible: boolean; invincibleTimer: number; hasShield: boolean; spreadShotTimer: number; }
interface Bullet { x: number; y: number; velocity: Velocity; lifetime: number; }
interface Asteroid { x: number; y: number; size: number; velocity: Velocity; rotation: number; rotationAngle: number; vertices: number; offsets: number[]; hue: number; }
interface Particle { x: number; y: number; velocity: Velocity; radius: number; color: string; lifetime: number; }
type PowerUpType = 'shield' | 'spread' | 'slowmo';
interface PowerUp { x: number; y: number; type: PowerUpType; lifetime: number; }
interface Keys { ArrowUp: boolean; ArrowLeft: boolean; ArrowRight: boolean; Space: boolean; }

interface GameLogic {
    ship: Ship | null;
    bullets: Bullet[];
    asteroids: Asteroid[];
    particles: Particle[];
    powerUps: PowerUp[];
    keys: Keys;
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    timeSlowTimer: number;
}

type GameState = 'start' | 'playing' | 'gameOver';

// Add this enum near your type definitions, above the Home component
enum PowerUpEnum {
  Shield = 'shield',
  Spread = 'spread',
  Slowmo = 'slowmo',
}


export default function Home() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);

  const gameLogic = useRef<GameLogic>({
    ship: null,
    bullets: [],
    asteroids: [],
    particles: [],
    powerUps: [],
    keys: { ArrowUp: false, ArrowLeft: false, ArrowRight: false, Space: false },
    canvas: null,
    ctx: null,
    timeSlowTimer: 0,
  });

  const createAsteroid = useCallback((x?: number, y?: number, size?: number) => {
    const game = gameLogic.current;
    if (!game.canvas) return;

    const astSize = size || Math.random() * 30 + 20;
    let astX, astY;

    if (x !== undefined && y !== undefined) {
        astX = x;
        astY = y;
    } else {
        if (Math.random() < 0.5) {
            astX = Math.random() < 0.5 ? -astSize : game.canvas.width + astSize;
            astY = Math.random() * game.canvas.height;
        } else {
            astX = Math.random() * game.canvas.width;
            astY = Math.random() < 0.5 ? -astSize : game.canvas.height + astSize;
        }
    }

    const speed = (Math.random() * 1.5 + 0.5) / (astSize / 30);
    const angle = Math.random() * Math.PI * 2;

    game.asteroids.push({
      x: astX, y: astY, size: astSize,
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      rotation: Math.random() * 0.02 - 0.01,
      rotationAngle: 0,
      vertices: Math.floor(Math.random() * 3) + 5,
      offsets: Array.from({ length: 7 }, () => Math.random() * 0.4 + 0.8),
      hue: Math.random() * 360,
    });
  }, []);

  const createParticles = useCallback((x: number, y: number, count: number) => {
    const game = gameLogic.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4;
      const hue = Math.random() * 360;
      game.particles.push({ x, y, velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, radius: Math.random() * 3 + 1, color: `hsl(${hue}, 100%, 70%)`, lifetime: Math.random() * 40 + 40 });
    }
  }, []);

  const startGame = () => {
    const game = gameLogic.current;
    if (!game.canvas) return;
    
    game.ship = {
      x: game.canvas.width / 2,
      y: game.canvas.height / 2,
      radius: 15,
      angle: -Math.PI / 2,
      rotation: 0,
      thrusting: false,
      thrustPower: 0.07,
      maxSpeed: 4,
      velocity: { x: 0, y: 0 },
      friction: 0.985,
      invincible: true,
      invincibleTimer: 180,
      hasShield: false,
      spreadShotTimer: 0,
    };
    
    game.bullets = [];
    game.asteroids = [];
    game.particles = [];
    game.powerUps = [];
    game.timeSlowTimer = 0;

    for (let i = 0; i < 5; i++) {
      createAsteroid();
    }
    setScore(0);
    setLives(3);
    setGameState('playing');
  };
  
  const gameOver = () => {
    setGameState('gameOver');
    if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
    }
  };
  
  const gameLoop = () => {
    const game = gameLogic.current;
    if (!game.ctx || !game.canvas) return;

    game.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

    const gameSpeed = game.timeSlowTimer > 0 ? 0.5 : 1;

    updateShip();
    updateBullets(gameSpeed);
    updateAsteroids(gameSpeed);
    updateParticles(gameSpeed);
    updatePowerUps();
    checkCollisions();
    drawShip();
    drawBullets();
    drawAsteroids();
    drawParticles();
    drawPowerUps();

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };
  
  const updateShip = () => {
    const game = gameLogic.current;
    const { ship, keys, canvas } = game;
    if (!ship || !canvas) return;

    if (ship.spreadShotTimer > 0) ship.spreadShotTimer--;
    if (game.timeSlowTimer > 0) game.timeSlowTimer--;
    
    if (keys.ArrowLeft) ship.rotation = -0.05;
    else if (keys.ArrowRight) ship.rotation = 0.05;
    else ship.rotation = 0;

    ship.angle += ship.rotation;
    ship.thrusting = keys.ArrowUp;

    if (ship.thrusting) {
        ship.velocity.x += Math.cos(ship.angle) * ship.thrustPower;
        ship.velocity.y += Math.sin(ship.angle) * ship.thrustPower;
        const speed = Math.sqrt(ship.velocity.x**2 + ship.velocity.y**2);
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
        if (ship.invincibleTimer <= 0) ship.invincible = false;
    }

    if (keys.Space && game.bullets.length < 15) {
        const bulletSpeed = 6;
        const fireBullet = (angleOffset: number) => {
            const angle = ship.angle + angleOffset;
            game.bullets.push({
                x: ship.x + Math.cos(angle) * ship.radius,
                y: ship.y + Math.sin(angle) * ship.radius,
                velocity: {
                    x: Math.cos(angle) * bulletSpeed + ship.velocity.x,
                    y: Math.sin(angle) * bulletSpeed + ship.velocity.y,
                },
                lifetime: 100,
            });
        }
        
        if (ship.spreadShotTimer > 0) {
            fireBullet(-0.2);
            fireBullet(0);
            fireBullet(0.2);
        } else {
            fireBullet(0);
        }
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

    const hue = (Date.now() / 20) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
    ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
    ctx.shadowBlur = 10;

    if (ship.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 0;
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
        const flameHue = (hue + 180) % 360; // Opposite color
        ctx.fillStyle = `hsl(${flameHue}, 100%, 70%)`;
        ctx.fill();
    }
    ctx.restore();

    // Draw Shield
    if (ship.hasShield) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        const shieldHue = (120 + Date.now() / 30) % 360; // Blue/Green pulse
        ctx.strokeStyle = `hsla(${shieldHue}, 100%, 70%, 0.8)`;
        ctx.fillStyle = `hsla(${shieldHue}, 100%, 70%, 0.1)`;
        ctx.shadowColor = `hsl(${shieldHue}, 100%, 70%)`;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, ship.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        ctx.restore();
    }
  };
  
  const updateBullets = (gameSpeed: number) => {
    const game = gameLogic.current;
    if (!game.canvas) return;
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        bullet.x += bullet.velocity.x * gameSpeed;
        bullet.y += bullet.velocity.y * gameSpeed;
        if (bullet.x < 0 || bullet.x > game.canvas.width || bullet.y < 0 || bullet.y > game.canvas.height) {
            bullet.lifetime = 0;
        }
        bullet.lifetime--;
        if (bullet.lifetime <= 0) game.bullets.splice(i, 1);
    }
  };

  const drawBullets = () => {
    const game = gameLogic.current;
    const { ctx } = game;
    if (!ctx) return;
    
    for (const bullet of game.bullets) {
        ctx.fillStyle = '#f0f'; // Bright magenta
        ctx.shadowColor = '#f0f';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset for other elements
    }
  };

  const updateAsteroids = (gameSpeed: number) => {
    const game = gameLogic.current;
    if (!game.canvas) return;
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];
        asteroid.x += asteroid.velocity.x * gameSpeed;
        asteroid.y += asteroid.velocity.y * gameSpeed;
        if (asteroid.x < -asteroid.size) asteroid.x = game.canvas.width + asteroid.size;
        if (asteroid.x > game.canvas.width + asteroid.size) asteroid.x = -asteroid.size;
        if (asteroid.y < -asteroid.size) asteroid.y = game.canvas.height + asteroid.size;
        if (asteroid.y > game.canvas.height + asteroid.size) asteroid.y = -asteroid.size;
        asteroid.rotationAngle += asteroid.rotation * gameSpeed;
    }
    if (game.asteroids.length < 12 && Math.random() < 0.015) {
        createAsteroid();
    }
  };

  const drawAsteroids = () => {
    const game = gameLogic.current;
    const { ctx } = game;
    if (!ctx) return;
    
    for (const asteroid of game.asteroids) {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.rotationAngle);
        ctx.beginPath();
        for (let i = 0; i < asteroid.vertices; i++) {
            const angle = (i / asteroid.vertices) * Math.PI * 2;
            const radius = asteroid.size * asteroid.offsets[i];
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const hue = (asteroid.hue + Date.now() / 50) % 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
    ctx.shadowBlur = 0; // Reset shadow
  };

  const updateParticles = (gameSpeed: number) => {
    const game = gameLogic.current;
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.velocity.x * gameSpeed;
        p.y += p.velocity.y * gameSpeed;
        p.velocity.x *= 0.98;
        p.velocity.y *= 0.98;
        p.lifetime--;
        if (p.lifetime <= 0) game.particles.splice(i, 1);
    }
  };

  const drawParticles = () => {
    const game = gameLogic.current;
    if (!game.ctx) return;
    for (const p of game.particles) {
        game.ctx.globalAlpha = p.lifetime / 60; // Fade out
        game.ctx.beginPath();
        game.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        game.ctx.fillStyle = p.color;
        game.ctx.fill();
        game.ctx.globalAlpha = 1.0; // Reset alpha
    }
  };

  const updatePowerUps = () => {
    const game = gameLogic.current;
    for (let i = game.powerUps.length - 1; i >= 0; i--) {
        const p = game.powerUps[i];
        p.lifetime--;
        if (p.lifetime <= 0) game.powerUps.splice(i, 1);
    }
  };

  const drawPowerUps = () => {
    const game = gameLogic.current;
    if (!game) return;
    game.powerUps.forEach(p => {
      if (!game.ctx) return;
        game.ctx.save();
        game.ctx.translate(p.x, p.y);
        let hue = 0;
        
    game.ctx.globalAlpha = p.lifetime < 60 ? p.lifetime / 60 : 1;

    switch (p.type) {
      case PowerUpEnum.Shield:
        hue = 120; // Green
        game.ctx.beginPath();
        game.ctx.moveTo(0, -10);
        game.ctx.lineTo(10, 5);
        game.ctx.lineTo(-10, 5);
        game.ctx.closePath();
        break;
      case PowerUpEnum.Spread:
        hue = 0; // Red
        game.ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          game.ctx.rect(-15 + i * 10, -3, 6, 6);
        }
        break;
      case PowerUpEnum.Slowmo:
        hue = 200; // Blue
        game.ctx.beginPath();
        game.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        break;
      default:
        break;
    }

    game.ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
    game.ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.2)`;
    game.ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
    game.ctx.shadowBlur = 15;
    game.ctx.lineWidth = 2;
    game.ctx.stroke();
    game.ctx.fill();
    game.ctx.restore();
    });
  };

  const checkCollisions = () => {
    const game = gameLogic.current;
    if (!game.ship || !game.canvas) return;

    // Bullets vs Asteroids
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const bullet = game.bullets[i];
      for (let j = game.asteroids.length - 1; j >= 0; j--) {
        const asteroid = game.asteroids[j];
        const distance = Math.sqrt((bullet.x - asteroid.x)**2 + (bullet.y - asteroid.y)**2);
        if (distance < asteroid.size) {
          setScore((prev) => prev + Math.floor(100 - asteroid.size));
          createParticles(asteroid.x, asteroid.y, 25);
          
          // Chance to drop powerup
          if (asteroid.size > 25 && Math.random() < 0.20) {
              const powerUpTypes: PowerUpType[] = ['shield', 'spread', 'slowmo'];
              const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
              game.powerUps.push({ x: asteroid.x, y: asteroid.y, type, lifetime: 300 });
          }

          if (asteroid.size > 25) {
            for (let k = 0; k < 2; k++) {
              createAsteroid(asteroid.x, asteroid.y, asteroid.size * 0.6);
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
        const distance = Math.sqrt((game.ship.x - asteroid.x)**2 + (game.ship.y - asteroid.y)**2);
        if (distance < game.ship.radius + asteroid.size * 0.8) {
          if (game.ship.hasShield) {
              game.ship.hasShield = false;
              game.asteroids.splice(i, 1);
              createParticles(asteroid.x, asteroid.y, 20);
              break;
          }

          setLives((prev) => {
            const newLives = prev - 1;
            if (newLives <= 0) gameOver();
            return newLives;
          });
          createParticles(game.ship.x, game.ship.y, 40);
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

    // Ship vs PowerUps
    for (let i = game.powerUps.length - 1; i >= 0; i--) {
        const p = game.powerUps[i];
        const distance = Math.sqrt((game.ship.x - p.x)**2 + (game.ship.y - p.y)**2);
        if (distance < game.ship.radius + 10) {
            if (p.type === 'shield') game.ship.hasShield = true;
            if (p.type === 'spread') game.ship.spreadShotTimer = 300; // 5 seconds
            if (p.type === 'slowmo') game.timeSlowTimer = 300;
            game.powerUps.splice(i, 1);
        }
    }
  };

  useEffect(() => {
    // ... useEffect logic remains the same
    const game = gameLogic.current;
    const canvas = canvasRef.current;
    if (canvas) {
        game.canvas = canvas;
        game.ctx = game.canvas.getContext('2d');
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                const { width, height } = container.getBoundingClientRect();
                canvas.width = 1280;
                canvas.height = 720;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
            }
        };
        const resizeObserver = new ResizeObserver(resizeCanvas);
        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
        resizeCanvas();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code in game.keys) {
        game.keys[e.code as keyof Keys] = true;
        e.preventDefault();
      }
      if (e.code === 'Space' && gameState === 'start') startGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in game.keys) game.keys[e.code as keyof Keys] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    if (gameState === 'playing') {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, createAsteroid, createParticles, gameLoop, startGame]);

  return (
    <div>
      <Head>
        <title>Futurist Asteroids</title>
        <meta name="description" content="A futurist take on the classic Asteroids game." />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#121212" />
      </Head>
      <div id="game-container">
        <canvas ref={canvasRef} id="game-canvas"></canvas>
        {gameState !== 'start' && <GameUI score={score} lives={lives} />}
        {gameState === 'start' && <StartScreen onStart={startGame} />}
        {gameState === 'gameOver' && <GameOverScreen score={score} onRestart={startGame} />}
      </div>
    </div>
  );
}

# Rock Paper Scissors: Card Duel

A Rock-Paper-Scissors card duel game. Build a 7-card deck, pick a character with a unique skill, and battle an NPC to 5 points first.

## Features

- 5 characters, each with a unique skill (fate swap, double points, curse, chaos strike, third eye)
- Free-form 7-card deck building (Scissors / Hammer / Paper)
- Turn-based battles with a skill phase and a choose phase, each on a countdown timer
- Pixel-art sprites, 8-bit sound effects and background music (Web Audio, no audio files)
- Vietnamese / English UI toggle
- Responsive layout (desktop and mobile)

## Tech stack

React + Vite + Tailwind CSS v4. The game engine (`src/engine/`) is a pure reducer with no UI dependencies, so it can later be reused as the authoritative logic for an online multiplayer mode.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

const COLORS = ['#38a8e8', '#cc2020', '#f0cc00', '#38c898', '#c4a8e8'];
const PIECES = Array.from({ length: 24 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.4,
  duration: 1.4 + Math.random() * 1.2,
  color: COLORS[i % COLORS.length],
  rotate: Math.random() * 360,
}));

export function WinConfetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
      {PIECES.map((p, i) => (
        <div
          key={i}
          className="absolute top-[-10px] w-2 h-2"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

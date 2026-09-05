const VARIANTS = {
  primary: 'border-accent-blue text-accent-blue shadow-[0_0_14px_rgba(56,168,232,0.35)]',
  outline: 'border-accent-green text-accent-green',
  ghost: 'border-border-dim text-text-dim3',
};

export function Button({ variant = 'ghost', className = '', ...props }) {
  return (
    <button
      className={`font-mono font-bold border-2 bg-transparent px-4 py-2.5 min-h-10 cursor-pointer tracking-wider uppercase text-[11px] sm:text-xs disabled:opacity-35 disabled:cursor-not-allowed enabled:hover:brightness-125 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

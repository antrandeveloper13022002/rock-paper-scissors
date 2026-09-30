const VARIANTS = {
  primary: 'bg-[#f2c14e] text-[#2a1a10] shadow-[0_0_0_3px_#2a1a10,inset_0_-4px_0_#b8862a,inset_0_3px_0_#ffe08f]',
  outline: 'bg-[#3f9c8c] text-[#0d1f1c] shadow-[0_0_0_3px_#2a1a10,inset_0_-4px_0_#2a6e63,inset_0_3px_0_#6fc4b5]',
  ghost: 'bg-[#4d4858] text-[#f3e2b8] shadow-[0_0_0_3px_#2a1a10,inset_0_-4px_0_#353140,inset_0_3px_0_#6a6479]',
};

// Size lives here (not in callers' className) so it never fights the default.
const SIZES = {
  md: 'min-h-11 text-[15px] sm:text-base',
  lg: 'min-h-14 text-xl sm:text-2xl',
};

export function Button({ variant = 'ghost', size = 'md', className = '', ...props }) {
  return (
    <button
      className={`font-mono border-0 px-4 py-2.5 cursor-pointer tracking-wider uppercase disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-110 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

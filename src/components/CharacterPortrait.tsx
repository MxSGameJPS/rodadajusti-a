import React, { useEffect, useState } from 'react';

interface CharacterPortraitProps {
  name: string;
  src?: string | null;
  avatarBg?: string;
  variant?: 'thumbnail' | 'conversation';
  className?: string;
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  name,
  src,
  avatarBg = '#1A1A1D',
  variant = 'thumbnail',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const isConversation = variant === 'conversation';
  const frameClass = isConversation
    ? 'relative flex min-h-[190px] w-full items-end justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_25%,rgba(197,160,89,0.18),transparent_42%),linear-gradient(155deg,#1A191B,#09090A)] sm:min-h-[240px] md:min-h-[300px]'
    : 'relative flex h-14 w-12 shrink-0 items-end justify-center overflow-hidden rounded-xl border border-[#2E2D31] bg-[#0C0C0D]';
  const imageClass = isConversation
    ? 'relative z-10 max-h-[300px] w-auto max-w-[94%] object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)]'
    : 'relative z-10 h-full w-full object-cover object-top';

  return (
    <div className={`${frameClass} ${className}`} style={!src || failed ? { backgroundColor: avatarBg } : undefined}>
      <span
        aria-hidden="true"
        className={`${isConversation ? 'text-7xl' : 'text-xl'} absolute inset-0 flex items-center justify-center font-black text-[#C5A059]/35`}
      >
        {name.charAt(0).toUpperCase()}
      </span>

      {src && !failed && (
        <img
          src={src}
          alt={`Retrato de ${name}`}
          className={imageClass}
          draggable={false}
          loading={isConversation ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}

      {isConversation && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-[#0A0A0B]/75 to-transparent" />
      )}
    </div>
  );
};

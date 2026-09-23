import React from 'react';
import { Bath, BedDouble, BookOpenCheck, Utensils } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';

interface PlayerNeedsStripProps {
  player: PlayerProfile;
  compact?: boolean;
}

function tone(value: number) {
  if (value <= 20) return 'text-[#F87171] border-[#F87171]/25 bg-[#F87171]/8';
  if (value <= 45) return 'text-[#FBBF24] border-[#FBBF24]/25 bg-[#FBBF24]/8';
  return 'text-[#A7D8C4] border-[#34D399]/20 bg-[#34D399]/7';
}

export const PlayerNeedsStrip: React.FC<PlayerNeedsStripProps> = ({ player, compact = false }) => {
  const needs = player.household?.needs;
  if (!needs) return null;

  const items = [
    { id: 'energy', label: 'Energia', value: needs.energy, icon: <BedDouble size={compact ? 11 : 12} /> },
    { id: 'hunger', label: 'Fome', value: needs.hunger, icon: <Utensils size={compact ? 11 : 12} /> },
    { id: 'hygiene', label: 'Higiene', value: needs.hygiene, icon: <Bath size={compact ? 11 : 12} /> },
    { id: 'study', label: 'Estudo', value: needs.study, icon: <BookOpenCheck size={compact ? 11 : 12} /> },
  ];

  return (
    <div className={compact ? 'flex items-center gap-1' : 'flex flex-wrap items-center gap-1.5'}>
      {items.map((item) => (
        <div
          key={item.id}
          title={item.label + ': ' + Math.round(item.value) + '%'}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 ${tone(item.value)}`}
        >
          {item.icon}
          {!compact && <span className="text-[7px] font-black uppercase tracking-wider">{item.label}</span>}
          <strong className="font-mono text-[8px]">{Math.round(item.value)}%</strong>
        </div>
      ))}
    </div>
  );
};

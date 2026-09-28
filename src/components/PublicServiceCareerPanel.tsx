import React, { useEffect, useState } from 'react';
import { Gavel, ShieldCheck, TrendingUp } from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import {
  applyPublicServicePromotion,
  hydratePublicService,
  nextPublicServicePromotion,
  performPublicServiceMonth,
  readPublicService,
  type PublicServiceState,
} from '../lib/publicServiceCareer';

interface PublicServiceCareerPanelProps {
  player: PlayerProfile;
  onCareerChange: (tier: PlayerProfile['careerTier']) => void;
  onMoneyChange: (value: number) => void;
}

export function PublicServiceCareerPanel({
  player,
  onCareerChange,
  onMoneyChange,
}: PublicServiceCareerPanelProps) {
  const [state, setState] = useState<PublicServiceState>(() => readPublicService(player));
  const [message, setMessage] = useState('');

  useEffect(() => {
    void hydratePublicService(player).then(setState);
  }, [player.cloudCareerId, player.careerTier]);

  const promotion = nextPublicServicePromotion(player, state);
  const isProsecution = state.track === 'PROSECUTION';

  const handleMonthlyService = async () => {
    try {
      const result = await performPublicServiceMonth(player);

      if (!result.ok) {
        setMessage('A atividade funcional deste mês já foi cumprida.');
        return;
      }

      setState(result.state);
      onMoneyChange(result.salary);
      setMessage('Mês funcional concluído. Subsídio recebido e mérito atualizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a atividade funcional.');
    }
  };

  const handlePromotion = async () => {
    try {
      const result = await applyPublicServicePromotion(player);

      if (!result.ok || !result.promotion) {
        setMessage('Os requisitos para promoção ainda não foram cumpridos.');
        return;
      }

      setState(result.state);
      onCareerChange(result.promotion.tier);
      setMessage('Promoção institucional efetivada.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível efetivar a promoção.');
    }
  };

  return (
    <section className="rounded-2xl border border-[#C5A059]/30 bg-[#111113] p-5 text-[#E8E8EA]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 p-3 text-[#C5A059]">
          {isProsecution ? <ShieldCheck size={21} /> : <Gavel size={21} />}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C5A059]">
            Carreira pública ativa
          </p>
          <h3 className="font-serif text-lg font-bold">
            {isProsecution ? 'Ministério Público' : 'Magistratura'}
          </h3>
        </div>
      </div>

      {message && <p className="mt-3 text-xs text-[#D6C59C]">{message}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-[#2A2A2E] p-3">
          <span className="text-[9px] uppercase text-[#777]">Tempo</span>
          <b className="mt-1 block">{state.monthsInRole} meses</b>
        </div>
        <div className="rounded-lg border border-[#2A2A2E] p-3">
          <span className="text-[9px] uppercase text-[#777]">Mérito</span>
          <b className="mt-1 block text-[#34D399]">{state.merit}/100</b>
        </div>
        <div className="rounded-lg border border-[#2A2A2E] p-3">
          <span className="text-[9px] uppercase text-[#777]">Atos</span>
          <b className="mt-1 block">{state.decisions}</b>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleMonthlyService()}
        className="mt-4 w-full rounded-xl bg-[#C5A059] px-4 py-3 text-xs font-black text-[#111]"
      >
        {isProsecution ? 'Cumprir atuação ministerial do mês' : 'Cumprir atividade jurisdicional do mês'}
      </button>

      {promotion && (
        <div className="mt-4 rounded-xl border border-[#2A2A2E] bg-[#0A0A0B] p-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#C5A059]" />
            <b className="text-sm">{promotion.label}</b>
          </div>

          <div className="mt-2 space-y-1">
            {promotion.requirements.map((requirement) => (
              <p key={requirement} className="text-[10px] text-[#888]">
                • {requirement}
              </p>
            ))}
          </div>

          <button
            type="button"
            disabled={!promotion.eligible}
            onClick={() => void handlePromotion()}
            className="mt-3 rounded-lg border border-[#C5A059]/40 px-4 py-2 text-xs font-bold text-[#C5A059] disabled:opacity-30"
          >
            Participar da promoção
          </button>
        </div>
      )}
    </section>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSignature,
  Laptop,
  Loader2,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { LegalCase, PlayerProfile, SocialJuridicoToolUse } from '../types/game';
import {
  loadActiveSocialJuridicoFeatures,
  type SocialJuridicoFeature,
  type SocialJuridicoFeatureId,
} from '../lib/socialJuridicoRepository';
import { sound } from '../utils/sound';

const HOME_URL = 'https://socialjuridico.com.br/?utm_source=rota-da-justica&utm_medium=game&utm_campaign=notebook_social_juridico';
const LAWYER_URL = 'https://socialjuridico.com.br/sou-advogado?utm_source=rota-da-justica&utm_medium=game&utm_campaign=notebook_social_juridico';
const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';

const ELIGIBLE_TIERS = new Set([
  'ADVOGADO_CONTRATADO',
  'ADVOGADO_SENIOR',
  'SOCIO_ESCRITORIO',
  'DONO_ESCRITORIO',
]);

const DEFAULT_MECHANICS: Record<SocialJuridicoFeatureId, { scoreBonus: number; timeCostHours: number }> = {
  sj_evidence_shield: { scoreBonus: 2, timeCostHours: 0 },
  sj_digital_signature: { scoreBonus: 3, timeCostHours: 0 },
  sj_extrajudicial_notice: { scoreBonus: 3, timeCostHours: 1 },
  sj_crm: { scoreBonus: 2, timeCostHours: 0 },
};

interface SocialJuridicoExperienceProps {
  player: PlayerProfile;
  currentCase: LegalCase | null;
  onUseTool: (tool: SocialJuridicoToolUse) => void;
}

function numberFromConfig(feature: SocialJuridicoFeature, key: 'scoreBonus' | 'timeCostHours') {
  const raw = feature.config[key];
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
    ? raw
    : DEFAULT_MECHANICS[feature.id][key];
}

function FeatureIcon({ id }: { id: SocialJuridicoFeatureId }) {
  if (id === 'sj_evidence_shield') return <ShieldCheck size={21} />;
  if (id === 'sj_digital_signature') return <FileSignature size={21} />;
  if (id === 'sj_extrajudicial_notice') return <Send size={21} />;
  return <Users size={21} />;
}

export const SocialJuridicoExperience: React.FC<SocialJuridicoExperienceProps> = ({
  player,
  currentCase,
  onUseTool,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [features, setFeatures] = useState<SocialJuridicoFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEligible = ELIGIBLE_TIERS.has(player.careerTier);
  const activeState = player.activeCase;
  const actions = activeState?.socialJuridicoActions || [];

  useEffect(() => {
    const openFromGame = () => {
      if (!isEligible) return;
      sound.playClick();
      setIsOpen(true);
    };
    window.addEventListener(OPEN_SOCIAL_JURIDICO_EVENT, openFromGame);
    return () => window.removeEventListener(OPEN_SOCIAL_JURIDICO_EVENT, openFromGame);
  }, [isEligible]);

  useEffect(() => {
    if (!isOpen || !isEligible) return;
    let active = true;
    setIsLoading(true);
    setError('');
    loadActiveSocialJuridicoFeatures()
      .then((loaded) => {
        if (active) setFeatures(loaded);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar as ferramentas.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEligible, isOpen]);

  const discoveredClues = useMemo(() => {
    if (!activeState || !currentCase) return [];
    const ids = new Set(activeState.discoveredClueIds);
    return currentCase.availableClues.filter((clue) => ids.has(clue.id));
  }, [activeState, currentCase]);

  if (!isOpen || !isEligible) return null;

  const openExternal = (url: string) => {
    sound.playClick();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const close = () => {
    sound.playClick();
    setIsOpen(false);
  };

  const useOnce = (feature: SocialJuridicoFeature, label: string) => {
    if (!activeState || actions.some((action) => action.featureId === feature.id)) return;
    sound.playPaper();
    onUseTool({
      featureId: feature.id,
      label,
      scoreBonus: numberFromConfig(feature, 'scoreBonus'),
      timeCostHours: numberFromConfig(feature, 'timeCostHours'),
    });
  };

  const renderFeatureAction = (feature: SocialJuridicoFeature) => {
    if (!activeState || !currentCase) {
      return (
        <div className="mt-4 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-[11px] text-[#777]">
          Abra um caso para utilizar esta ferramenta na simulação.
        </div>
      );
    }

    if (feature.id === 'sj_evidence_shield') {
      if (discoveredClues.length === 0) {
        return <p className="mt-4 text-[11px] text-[#777]">Descubra uma prova ou pista antes de iniciar a blindagem.</p>;
      }
      return (
        <div className="mt-4 space-y-2">
          {discoveredClues.map((clue) => {
            const protectedAlready = actions.some(
              (action) => action.featureId === feature.id && action.targetId === clue.id,
            );
            return (
              <div key={clue.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5">
                <div className="min-w-0">
                  <strong className="block truncate text-[11px] text-[#DDD]">{clue.title}</strong>
                  <span className="text-[9px] uppercase tracking-wider text-[#777]">{clue.relevance}</span>
                </div>
                <button
                  type="button"
                  disabled={protectedAlready}
                  onClick={() => {
                    if (protectedAlready) return;
                    sound.playPaper();
                    onUseTool({
                      featureId: feature.id,
                      targetId: clue.id,
                      label: `Prova blindada: ${clue.title}`,
                      scoreBonus: numberFromConfig(feature, 'scoreBonus'),
                      timeCostHours: numberFromConfig(feature, 'timeCostHours'),
                    });
                  }}
                  className="shrink-0 rounded-lg border border-[#34D399]/35 bg-[#34D399]/10 px-3 py-2 text-[10px] font-bold text-[#34D399] transition-colors hover:bg-[#34D399]/15 disabled:cursor-default disabled:border-[#2A2A2E] disabled:bg-[#161618] disabled:text-[#666]"
                >
                  {protectedAlready ? 'Blindada ✓' : 'Blindar prova'}
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    const alreadyUsed = actions.some((action) => action.featureId === feature.id);
    const labels: Record<Exclude<SocialJuridicoFeatureId, 'sj_evidence_shield'>, string> = {
      sj_digital_signature: 'Dossiê formalizado com assinatura digital',
      sj_extrajudicial_notice: 'Notificação extrajudicial enviada ao caso',
      sj_crm: 'Acompanhamento do cliente registrado no CRM',
    };
    const buttonLabels: Record<Exclude<SocialJuridicoFeatureId, 'sj_evidence_shield'>, string> = {
      sj_digital_signature: 'Assinar dossiê',
      sj_extrajudicial_notice: 'Enviar notificação',
      sj_crm: 'Registrar acompanhamento',
    };
    const id = feature.id as Exclude<SocialJuridicoFeatureId, 'sj_evidence_shield'>;
    const timeCost = numberFromConfig(feature, 'timeCostHours');

    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] text-[#777]">
          {timeCost > 0 ? <span className="inline-flex items-center gap-1"><Clock3 size={11} /> Consome {timeCost}h do prazo</span> : 'Ação digital sem consumo de deslocamento.'}
        </div>
        <button
          type="button"
          disabled={alreadyUsed}
          onClick={() => useOnce(feature, labels[id])}
          className="rounded-lg bg-[#C5A059] px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-[#0A0A0B] transition-colors hover:bg-[#D4B475] disabled:cursor-default disabled:bg-[#242429] disabled:text-[#777]"
        >
          {alreadyUsed ? 'Concluído ✓' : buttonLabels[id]}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-[#050506]/90 p-2 backdrop-blur-md sm:p-5">
      <div className="my-3 flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#C5A059]/35 bg-[#0D0D0F] text-[#E7E7E7] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#2A2A2E] bg-[#151517] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C5A059] text-[#09090A] shadow-lg shadow-[#C5A059]/10">
              <Laptop size={23} />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Notebook profissional</span>
              <h2 className="truncate font-serif text-lg font-black text-[#F2EFE8] sm:text-xl">Social Jurídico In-Game</h2>
              <p className="truncate text-[10px] text-[#777]">{player.name} • {currentCase ? currentCase.title : 'Escritório'}</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Fechar notebook" className="rounded-xl border border-[#2A2A2E] p-2.5 text-[#888] hover:border-[#555] hover:text-[#EEE]">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="mb-5 rounded-xl border border-[#60A5FA]/20 bg-[#60A5FA]/[0.05] p-4">
            <p className="text-xs leading-relaxed text-[#AFC5E8]">
              As ferramentas abaixo são simulações integradas ao Rota da Justiça. Elas só aparecem quando estão <strong>publicadas e ativas no Rota Admin</strong>. O conjunto de benefícios estratégicos do Social Jurídico é limitado a <strong>+10 pontos por caso</strong> para não substituir investigação, prova e estratégia processual.
            </p>
          </section>

          {activeState && (
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-3"><span className="block text-[9px] uppercase text-[#777]">Cliente</span><strong className="mt-1 block truncate text-xs">{currentCase?.client.name}</strong></div>
              <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-3"><span className="block text-[9px] uppercase text-[#777]">Prazo usado</span><strong className="mt-1 block text-xs text-[#60A5FA]">{activeState.hoursSpent}h / {currentCase?.deadlineHours}h</strong></div>
              <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-3"><span className="block text-[9px] uppercase text-[#777]">Provas encontradas</span><strong className="mt-1 block text-xs text-[#34D399]">{activeState.discoveredClueIds.length}</strong></div>
              <div className="rounded-xl border border-[#2A2A2E] bg-[#151517] p-3"><span className="block text-[9px] uppercase text-[#777]">Ações digitais</span><strong className="mt-1 block text-xs text-[#C5A059]">{actions.length}</strong></div>
            </div>
          )}

          {isLoading && (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
              <Loader2 size={28} className="animate-spin text-[#C5A059]" />
              <p className="text-xs text-[#888]">Sincronizando aplicativos publicados no Rota Admin...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 p-4 text-xs text-[#FCA5A5]">{error}</div>
          )}

          {!isLoading && !error && features.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#34343A] bg-[#111113] p-8 text-center">
              <Laptop size={32} className="mx-auto text-[#555]" />
              <h3 className="mt-3 font-bold text-[#CCC]">Nenhum aplicativo publicado</h3>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-[#777]">
                O notebook está disponível, mas o administrador ainda não publicou nenhuma ferramenta do Social Jurídico In-Game.
              </p>
            </div>
          )}

          {!isLoading && !error && features.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {features.map((feature) => {
                const featureActions = actions.filter((action) => action.featureId === feature.id);
                return (
                  <article key={feature.id} className="rounded-2xl border border-[#2B2B31] bg-[#151517] p-4 shadow-lg sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/10 text-[#C5A059]">
                        <FeatureIcon id={feature.id} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#ECECEF]">{feature.name}</h3>
                          <span className="rounded-md border border-[#34D399]/25 bg-[#34D399]/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#34D399]">Ativa</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#8F8F95]">{feature.description}</p>
                      </div>
                    </div>
                    {renderFeatureAction(feature)}
                    {featureActions.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#34D399]">
                        <CheckCircle2 size={12} /> {featureActions.length} ação(ões) registrada(s) neste caso
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-[#2A2A2E] bg-[#111113] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <p className="text-[9px] leading-relaxed text-[#666]">Ambiente simulado. Nenhuma assinatura, notificação ou blindagem realizada aqui produz efeitos jurídicos reais.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => openExternal(HOME_URL)} className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2E] px-3 py-2 text-[10px] font-bold text-[#AAA] hover:border-[#C5A059]/40 hover:text-[#DDD]">Conhecer plataforma <ExternalLink size={12} /></button>
            <button type="button" onClick={() => openExternal(LAWYER_URL)} className="flex items-center gap-1.5 rounded-lg bg-[#C5A059] px-3 py-2 text-[10px] font-black text-[#09090A]">Social Jurídico para advogados <ExternalLink size={12} /></button>
          </div>
        </footer>
      </div>
    </div>
  );
};

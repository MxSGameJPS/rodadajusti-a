import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSignature,
  FolderKanban,
  Home,
  Laptop,
  Loader2,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import {
  getIndependentMarketplaceCase,
  isSocialJuridicoProActive,
  readIndependentPracticeState,
  SOCIAL_JURIDICO_PRO_MONTHLY_PRICE,
  startIndependentMarketplaceCase,
  subscribeSocialJuridicoPro,
} from '../../lib/independentPractice';
import {
  loadActiveSocialJuridicoFeatures,
  type SocialJuridicoFeature,
  type SocialJuridicoFeatureId,
} from '../../lib/socialJuridicoRepository';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { LegalCase, PlayerProfile, SocialJuridicoToolUse } from '../../types/game';
import { sound } from '../../utils/sound';

const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';

type Tab = 'HOME' | 'CRM' | 'TOOLS';

const DEFAULT_MECHANICS: Record<SocialJuridicoFeatureId, { scoreBonus: number; timeCostHours: number }> = {
  sj_evidence_shield: { scoreBonus: 2, timeCostHours: 0 },
  sj_digital_signature: { scoreBonus: 3, timeCostHours: 0 },
  sj_extrajudicial_notice: { scoreBonus: 3, timeCostHours: 1 },
  sj_crm: { scoreBonus: 2, timeCostHours: 0 },
};

interface IndependentSocialJuridicoExperienceProps {
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
  if (id === 'sj_evidence_shield') return <ShieldCheck size={19} />;
  if (id === 'sj_digital_signature') return <FileSignature size={19} />;
  if (id === 'sj_extrajudicial_notice') return <Send size={19} />;
  return <Wrench size={19} />;
}

export const IndependentSocialJuridicoExperience: React.FC<IndependentSocialJuridicoExperienceProps> = ({
  player,
  currentCase,
  onUseTool,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('HOME');
  const [features, setFeatures] = useState<SocialJuridicoFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchaseError, setPurchaseError] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const displayName = usePlayerDisplayName(player, 'Advogado');
  const practice = readIndependentPracticeState(player);
  const subscriptionActive = isSocialJuridicoProActive(player, practice);
  const assignedCase = useMemo(() => getIndependentMarketplaceCase(player, GAME_CASES), [player, subscriptionActive]);
  const activeState = player.activeCase;
  const actions = activeState?.socialJuridicoActions || [];
  const crmFeature = features.find((feature) => feature.id === 'sj_crm') || null;

  const discoveredClues = useMemo(() => {
    if (!activeState || !currentCase) return [];
    const ids = new Set(activeState.discoveredClueIds);
    return currentCase.availableClues.filter((clue) => ids.has(clue.id));
  }, [activeState, currentCase]);

  useEffect(() => {
    const open = () => {
      sound.playClick();
      setTab('HOME');
      setPurchaseError('');
      setIsOpen(true);
    };
    window.addEventListener(OPEN_SOCIAL_JURIDICO_EVENT, open);
    return () => window.removeEventListener(OPEN_SOCIAL_JURIDICO_EVENT, open);
  }, []);

  useEffect(() => {
    if (!isOpen || !subscriptionActive) return;
    let active = true;
    setIsLoading(true);
    setError('');
    loadActiveSocialJuridicoFeatures()
      .then((loaded) => {
        if (active) setFeatures(loaded);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível sincronizar os módulos.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, subscriptionActive]);

  if (!isOpen) return null;

  const close = () => {
    sound.playClick();
    setIsOpen(false);
  };

  const subscribe = () => {
    sound.playStamp();
    setPurchaseError('');
    const result = subscribeSocialJuridicoPro(player);
    if (!result.ok) {
      setPurchaseError(result.reason === 'MONEY'
        ? `Saldo insuficiente. Você precisa de ${SOCIAL_JURIDICO_PRO_MONTHLY_PRICE} JR para ativar o plano.`
        : 'Não foi possível registrar a assinatura no save local.');
      return;
    }
    window.location.reload();
  };

  const acceptCase = () => {
    if (!assignedCase || activeState || !crmFeature) return;
    setAssignmentError('');
    sound.playPaper();
    if (!startIndependentMarketplaceCase(player, assignedCase)) {
      setAssignmentError('Não foi possível registrar este caso. Verifique se sua assinatura continua ativa.');
      return;
    }
    window.location.reload();
  };

  const useOnce = (feature: SocialJuridicoFeature, label: string, targetId?: string) => {
    if (!activeState) return;
    const duplicate = actions.some((action) =>
      action.featureId === feature.id && (targetId ? action.targetId === targetId : !action.targetId),
    );
    if (duplicate) return;
    sound.playPaper();
    onUseTool({
      featureId: feature.id,
      targetId,
      label,
      scoreBonus: numberFromConfig(feature, 'scoreBonus'),
      timeCostHours: numberFromConfig(feature, 'timeCostHours'),
    });
  };

  if (!subscriptionActive) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-md">
        <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#3B3430] bg-[#121214] shadow-2xl">
          <header className="flex items-center justify-between border-b border-[#2B2B30] bg-[#171719] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059]"><Laptop size={22} /></div>
              <div><span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#A38C5B]">Acesso profissional encerrado</span><h2 className="font-serif text-xl font-black text-[#EFECE6]">Social Jurídico</h2></div>
            </div>
            <button type="button" onClick={close} className="rounded-lg p-2 text-[#888] hover:bg-white/5"><X size={18} /></button>
          </header>

          <div className="space-y-5 p-5 sm:p-7">
            <div className="rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.06] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#FBBF24]" />
                <div>
                  <h3 className="text-base font-black text-[#F8E9C4]">Você não faz mais parte do acesso Enterprise do Ramos & Associados.</h3>
                  <p className="mt-2 text-xs leading-6 text-[#B7AA8C]">O plano utilizado durante seu vínculo era pago pelo escritório. Como seu contrato foi encerrado, nenhum novo caso do Ramos pode aparecer para você no CRM.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#C5A059]/35 bg-[linear-gradient(135deg,#1B1812,#111214)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#C5A059]">Plano pessoal</span>
                  <h3 className="mt-1 font-serif text-2xl font-black text-[#F4F0E7]">Social Jurídico Pro</h3>
                  <p className="mt-2 max-w-md text-xs leading-5 text-[#A39D92]">Crie sua conta própria e use a plataforma sem depender de um empregador. O CRM passa a mostrar oportunidades da plataforma, além das ferramentas jurídicas publicadas.</p>
                </div>
                <div className="rounded-xl border border-[#C5A059]/30 bg-[#0D0E10] px-4 py-3 text-center">
                  <strong className="block font-mono text-2xl text-[#E8CC8B]">{SOCIAL_JURIDICO_PRO_MONTHLY_PRICE} JR</strong>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#777]">por mês no jogo</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl border border-[#2D2D31] bg-[#0F1012] p-3 text-[#BFC0C4]"><CheckCircle2 size={15} className="text-[#34D399]" /> CRM com oportunidades disponíveis</div>
                <div className="flex items-center gap-2 rounded-xl border border-[#2D2D31] bg-[#0F1012] p-3 text-[#BFC0C4]"><CheckCircle2 size={15} className="text-[#34D399]" /> Ferramentas do plano Pro</div>
                <div className="flex items-center gap-2 rounded-xl border border-[#2D2D31] bg-[#0F1012] p-3 text-[#BFC0C4]"><CheckCircle2 size={15} className="text-[#34D399]" /> Conta independente do escritório</div>
                <div className="flex items-center gap-2 rounded-xl border border-[#2D2D31] bg-[#0F1012] p-3 text-[#BFC0C4]"><Clock3 size={15} className="text-[#C5A059]" /> Renovação por mês de calendário do jogo</div>
              </div>
            </div>

            {purchaseError && <p className="rounded-xl border border-[#EF4444]/25 bg-[#EF4444]/[0.06] p-3 text-xs font-bold text-[#FCA5A5]">{purchaseError}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={close} className="rounded-xl border border-[#37373D] bg-[#19191C] px-4 py-3.5 text-xs font-black text-[#C7C7CB]">Agora não</button>
              <button type="button" onClick={subscribe} disabled={player.money < SOCIAL_JURIDICO_PRO_MONTHLY_PRICE} className="rounded-xl bg-[#C5A059] px-4 py-3.5 text-xs font-black text-[#0B0B0C] disabled:cursor-not-allowed disabled:opacity-45">Criar conta e assinar Pro</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const toolFeatures = features.filter((feature) => feature.id !== 'sj_crm');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-2 backdrop-blur-md sm:p-5">
      <section className="flex h-[min(900px,94vh)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#2B2B30] bg-[#0C0D0F] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#2B2B30] bg-[#151619] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C5A059] text-[#0A0A0B]"><Laptop size={20} /></div>
            <div><span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#C5A059]">Conta própria • Plano Pro</span><h2 className="text-base font-black text-[#F0EEE9]">Social Jurídico</h2><p className="text-[9px] text-[#777]">{displayName} • assinatura independente</p></div>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-2 text-[#888] hover:bg-white/5"><X size={18} /></button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[210px_1fr]">
          <aside className="border-b border-[#26272B] bg-[#111215] p-3 md:border-b-0 md:border-r">
            <nav className="grid grid-cols-3 gap-2 md:grid-cols-1">
              <button type="button" onClick={() => setTab('HOME')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold md:justify-start ${tab === 'HOME' ? 'bg-[#C5A059]/12 text-[#D8B86F]' : 'text-[#888] hover:bg-white/5'}`}><Home size={15} /> Início</button>
              <button type="button" onClick={() => setTab('CRM')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold md:justify-start ${tab === 'CRM' ? 'bg-[#C5A059]/12 text-[#D8B86F]' : 'text-[#888] hover:bg-white/5'}`}><FolderKanban size={15} /> CRM</button>
              <button type="button" onClick={() => setTab('TOOLS')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold md:justify-start ${tab === 'TOOLS' ? 'bg-[#C5A059]/12 text-[#D8B86F]' : 'text-[#888] hover:bg-white/5'}`}><Wrench size={15} /> Ferramentas</button>
            </nav>
            <div className="mt-4 hidden rounded-xl border border-[#2A2B30] bg-[#0B0C0E] p-3 text-[9px] leading-4 text-[#777] md:block"><strong className="block text-[#BBA568]">Plano Pro ativo</strong>Válido até {practice.socialJuridicoPaidThrough || '—'}. O antigo escritório não tem acesso a esta conta.</div>
          </aside>

          <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
            {isLoading && <div className="grid h-full place-items-center text-center"><div><Loader2 size={28} className="mx-auto animate-spin text-[#C5A059]" /><p className="mt-3 text-xs text-[#888]">Sincronizando módulos...</p></div></div>}
            {!isLoading && error && <div className="rounded-xl border border-[#EF4444]/25 bg-[#EF4444]/[0.05] p-4 text-xs text-[#FCA5A5]">{error}</div>}

            {!isLoading && !error && tab === 'HOME' && (
              <div className="space-y-5">
                <div><span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#C5A059]">Advocacia independente</span><h3 className="mt-1 font-serif text-2xl font-black text-[#F0EEE9]">Seu ambiente profissional agora é seu.</h3><p className="mt-2 max-w-3xl text-xs leading-5 text-[#8D8D94]">O CRM não está conectado ao Ramos & Associados. Casos exibidos aqui são oportunidades da plataforma aceitas pela sua conta própria.</p></div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-[#292A2E] bg-[#131416] p-4"><span className="text-[9px] uppercase text-[#777]">Caso ativo</span><strong className="mt-1 block text-sm text-[#E8E8EA]">{currentCase?.code || 'Nenhum'}</strong></div>
                  <div className="rounded-xl border border-[#292A2E] bg-[#131416] p-4"><span className="text-[9px] uppercase text-[#777]">Oportunidade</span><strong className="mt-1 block text-sm text-[#E8E8EA]">{assignedCase ? assignedCase.code : 'Aguardando'}</strong></div>
                  <div className="rounded-xl border border-[#292A2E] bg-[#131416] p-4"><span className="text-[9px] uppercase text-[#777]">Ferramentas</span><strong className="mt-1 block text-sm text-[#E8E8EA]">{toolFeatures.length}</strong></div>
                  <div className="rounded-xl border border-[#292A2E] bg-[#131416] p-4"><span className="text-[9px] uppercase text-[#777]">Plano</span><strong className="mt-1 block text-sm text-[#6EE7B7]">Pro ativo</strong></div>
                </div>
                <button type="button" onClick={() => setTab('CRM')} className="flex w-full items-center gap-4 rounded-2xl border border-[#C5A059]/25 bg-[#C5A059]/[0.06] p-5 text-left"><FolderKanban size={24} className="text-[#C5A059]" /><div><span className="text-[9px] font-black uppercase tracking-wider text-[#9C8A61]">CRM pessoal</span><strong className="mt-1 block text-base text-[#EDE9E0]">{activeState ? 'Atendimento em andamento' : assignedCase ? 'Nova oportunidade disponível' : 'Sem nova oportunidade agora'}</strong></div></button>
              </div>
            )}

            {!isLoading && !error && tab === 'CRM' && (
              <div className="space-y-5">
                <div><span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#C5A059]">CRM • Conta própria</span><h3 className="mt-1 font-serif text-2xl font-black text-[#F0EEE9]">Oportunidades e atendimentos</h3><p className="mt-2 text-xs leading-5 text-[#8D8D94]">Não há distribuição do Dr. Roberto nem intermediação da Mariana nesta conta.</p></div>
                {!crmFeature && <div className="flex gap-3 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.05] p-4"><LockKeyhole size={19} className="text-[#FBBF24]" /><div><strong className="text-sm text-[#E9D7AA]">CRM indisponível no momento</strong><p className="mt-1 text-xs text-[#94866A]">O módulo precisa estar publicado no Rota Admin.</p></div></div>}
                {crmFeature && activeState && currentCase && <div className="rounded-2xl border border-[#36554A] bg-[#0F1714] p-5"><span className="text-[9px] font-black uppercase tracking-wider text-[#6EE7B7]">Caso ativo</span><h4 className="mt-1 text-lg font-black text-[#EAF7F1]">{currentCase.title}</h4><p className="mt-2 text-xs text-[#8EAAA0]">{currentCase.code} • {currentCase.client.name} • {activeState.hoursSpent}h utilizadas</p></div>}
                {crmFeature && !activeState && assignedCase && <div className="rounded-2xl border border-[#C5A059]/35 bg-[#18160F] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><span className="text-[9px] font-black uppercase tracking-wider text-[#C5A059]">Oportunidade da plataforma</span><h4 className="mt-1 text-lg font-black text-[#F0E8D7]">{assignedCase.title}</h4><p className="mt-2 text-xs leading-5 text-[#A39A86]">{assignedCase.code} • {assignedCase.area} • cliente: {assignedCase.client.name}</p></div><button type="button" onClick={acceptCase} className="rounded-xl bg-[#C5A059] px-4 py-3 text-xs font-black text-[#0B0B0C]">Aceitar caso</button></div>{assignmentError && <p className="mt-3 text-xs font-bold text-[#FCA5A5]">{assignmentError}</p>}</div>}
                {crmFeature && !activeState && !assignedCase && <div className="rounded-2xl border border-dashed border-[#34343A] bg-[#111214] p-8 text-center"><Sparkles size={25} className="mx-auto text-[#666]" /><strong className="mt-3 block text-sm text-[#C9C9CE]">Nenhuma nova oportunidade disponível agora</strong><p className="mt-1 text-xs text-[#777]">Continue desenvolvendo sua reputação e acompanhe a plataforma.</p></div>}
              </div>
            )}

            {!isLoading && !error && tab === 'TOOLS' && (
              <div className="space-y-5">
                <div><span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#C5A059]">Ferramentas Pro</span><h3 className="mt-1 font-serif text-2xl font-black text-[#F0EEE9]">Módulos jurídicos</h3><p className="mt-2 text-xs text-[#8D8D94]">As ferramentas ficam vinculadas ao caso ativo da sua própria carteira.</p></div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {toolFeatures.map((feature) => {
                    const alreadyUsed = actions.some((action) => action.featureId === feature.id && !action.targetId);
                    const timeCost = numberFromConfig(feature, 'timeCostHours');
                    return (
                      <article key={feature.id} className="rounded-2xl border border-[#2B2C30] bg-[#131416] p-4">
                        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/20 bg-[#C5A059]/8 text-[#C5A059]"><FeatureIcon id={feature.id} /></div><div><strong className="text-sm text-[#E5E4E1]">{feature.name}</strong><p className="mt-1 text-[10px] leading-4 text-[#7F7F86]">{feature.description}</p></div></div>
                        {!activeState || !currentCase ? <p className="mt-4 rounded-lg bg-[#0D0E10] p-3 text-[10px] text-[#6F6F75]">Abra um caso para utilizar esta ferramenta.</p> : feature.id === 'sj_evidence_shield' ? (
                          <div className="mt-4 space-y-2">{discoveredClues.length === 0 ? <p className="rounded-lg bg-[#0D0E10] p-3 text-[10px] text-[#777]">Descubra uma prova antes de usar a blindagem.</p> : discoveredClues.map((clue) => { const protectedAlready = actions.some((action) => action.featureId === feature.id && action.targetId === clue.id); return <button key={clue.id} type="button" disabled={protectedAlready} onClick={() => useOnce(feature, `Prova blindada: ${clue.title}`, clue.id)} className="flex w-full items-center justify-between rounded-lg border border-[#2C2D31] bg-[#0E0F11] px-3 py-2 text-left text-[10px] text-[#BEBEC3] disabled:opacity-50"><span>{clue.title}</span><span>{protectedAlready ? 'Blindada ✓' : 'Blindar'}</span></button>; })}</div>
                        ) : (
                          <button type="button" disabled={alreadyUsed} onClick={() => useOnce(feature, feature.id === 'sj_digital_signature' ? 'Dossiê formalizado com assinatura digital' : feature.id === 'sj_extrajudicial_notice' ? 'Notificação extrajudicial enviada ao caso' : feature.name)} className="mt-4 w-full rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/8 px-3 py-2.5 text-xs font-black text-[#D6BA77] disabled:opacity-45">{alreadyUsed ? 'Concluído ✓' : timeCost > 0 ? `Utilizar • ${timeCost}h` : 'Utilizar ferramenta'}</button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  );
};

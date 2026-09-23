import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  acceptLawFirmOffer,
  applyToLawFirm,
  declineLawFirmOffer,
  evaluateMarketPolicy,
  loadLawFirmMarket,
  type LawFirmMarketFirm,
  type LawFirmMarketSnapshot,
  type LawFirmOffer,
} from '../../lib/lawFirmMarket';
import { readProfessionalEmploymentState } from '../../lib/professionalEmployment';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';

interface LawFirmMarketModalProps {
  player: PlayerProfile;
  isOpen: boolean;
  onClose: () => void;
  onAccepted?: () => void;
}

function formatMoney(value: number) {
  return Math.max(0, Number(value || 0)).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function offerTypeLabel(type: LawFirmOffer['offerType']) {
  if (type === 'POST_TERMINATION') return 'Convite após desligamento';
  if (type === 'APPLICATION_APPROVED') return 'Candidatura aprovada';
  if (type === 'HEADHUNTING') return 'Headhunting';
  if (type === 'RETURN') return 'Convite de retorno';
  if (type === 'COUNTEROFFER') return 'Contraproposta';
  if (type === 'CONTINUITY') return 'Continuidade';
  return 'Proposta pós-OAB';
}

function marketTierLabel(value: string) {
  const labels: Record<string, string> = {
    LOCAL: 'Local',
    REGIONAL: 'Regional',
    NATIONAL: 'Nacional',
    ELITE: 'Elite',
  };
  return labels[value] || value;
}

function sizeLabel(value: string) {
  const labels: Record<string, string> = {
    SMALL: 'Pequeno',
    MEDIUM: 'Médio',
    LARGE: 'Grande',
    MEGA: 'Mega escritório',
  };
  return labels[value] || value;
}

function pendingOfferForFirm(offers: LawFirmOffer[], firmId: string) {
  return offers.find((offer) => offer.lawFirmId === firmId && offer.status === 'PENDING') || null;
}

export const LawFirmMarketModal: React.FC<LawFirmMarketModalProps> = ({
  player,
  isOpen,
  onClose,
  onAccepted,
}) => {
  const [snapshot, setSnapshot] = useState<LawFirmMarketSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const employment = useMemo(() => readProfessionalEmploymentState(player), [
    player.cloudCareerId,
    player.name,
    player.officeDiscipline?.employmentStatus,
  ]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const next = await loadLawFirmMarket(player);
      setSnapshot(next);
    } catch (cause) {
      console.error('[Rota da Justiça] Falha ao abrir mercado de trabalho.', cause);
      setError('Não foi possível consultar os escritórios publicados. Confirme a migration do Mercado de Trabalho no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void refresh();
  }, [isOpen, player.cloudCareerId, player.reputation, player.xp, player.casesSolved, player.officeDiscipline?.employmentStatus]);

  const pendingOffers = useMemo(
    () => (snapshot?.offers || []).filter((offer) => offer.status === 'PENDING'),
    [snapshot?.offers],
  );

  const accept = async (offer: LawFirmOffer) => {
    setBusyId(offer.id);
    setError('');
    try {
      await acceptLawFirmOffer(player, offer);
      sound.playStamp();
      setNotice(`Contrato aceito. Você agora integra ${offer.terms.officeName} como ${offer.terms.roleTitle}.`);
      await refresh();
      onAccepted?.();
    } catch (cause) {
      console.error(cause);
      setError('Não foi possível concluir a contratação.');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (offer: LawFirmOffer) => {
    setBusyId(offer.id);
    setError('');
    try {
      await declineLawFirmOffer(player, offer);
      sound.playClick();
      setNotice('Proposta recusada. O histórico foi preservado para respeitar o cooldown do escritório.');
      await refresh();
    } catch (cause) {
      console.error(cause);
      setError('Não foi possível recusar a proposta.');
    } finally {
      setBusyId(null);
    }
  };

  const apply = async (firm: LawFirmMarketFirm) => {
    setBusyId(firm.id);
    setError('');
    setNotice('');
    try {
      const result = await applyToLawFirm(player, firm, snapshot?.offers || []);
      if (!result.offer) {
        setError(result.reasons.join(' '));
        return;
      }
      sound.playStamp();
      setNotice(`Sua candidatura a ${firm.name} passou pelos requisitos e gerou uma proposta formal.`);
      await refresh();
    } catch (cause) {
      console.error(cause);
      setError('Não foi possível enviar a candidatura.');
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-5">
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#30343B] bg-[#0D0F12] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#262A30] bg-[#111419] px-5 py-4 sm:px-7">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#60A5FA]/25 bg-[#60A5FA]/10 text-[#93C5FD]">
              <BriefcaseBusiness size={25} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#7FA8DC]">Mercado jurídico nacional</span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#F3F1EC] sm:text-2xl">Mercado de Trabalho</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[#8E939C]">
                Escritórios publicados no Rota Admin aparecem aqui com requisitos, cargos e condições contratuais próprias.
                Após uma demissão, escritórios elegíveis podem enviar convites automaticamente.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#30353D] text-[#A5ABB4] transition hover:bg-white/5 disabled:opacity-40"
              aria-label="Atualizar mercado"
              title="Atualizar mercado"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#30353D] text-[#A5ABB4] transition hover:bg-white/5"
              aria-label="Fechar mercado"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2A2F36] bg-[#12151A] p-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#777F8A]">Situação atual</span>
              <strong className="mt-1 block text-sm text-[#E5E8EC]">
                {player.officeDiscipline?.employmentStatus === 'TERMINATED'
                  ? 'Disponível para contratação'
                  : employment?.officeName || 'Carreira profissional'}
              </strong>
              <small className="mt-1 block text-[10px] text-[#777F8A]">
                {player.officeDiscipline?.employmentStatus === 'TERMINATED'
                  ? 'Vínculo anterior encerrado'
                  : employment?.role || 'Advogado'}
              </small>
            </div>
            <div className="rounded-2xl border border-[#2A2F36] bg-[#12151A] p-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#777F8A]">Perfil profissional</span>
              <strong className="mt-1 block text-sm text-[#E5E8EC]">{player.reputation}/100 reputação</strong>
              <small className="mt-1 block text-[10px] text-[#777F8A]">{player.xp.toLocaleString('pt-BR')} XP • {player.casesSolved} casos vencidos</small>
            </div>
            <div className="rounded-2xl border border-[#2A2F36] bg-[#12151A] p-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#777F8A]">Propostas abertas</span>
              <strong className="mt-1 block text-sm text-[#E5E8EC]">{pendingOffers.length}</strong>
              <small className="mt-1 block text-[10px] text-[#777F8A]">Convites e candidaturas aprovadas</small>
            </div>
          </section>

          {loading && !snapshot && (
            <div className="rounded-2xl border border-[#2C323A] bg-[#12151A] p-8 text-center text-sm text-[#949AA4]">
              Consultando escritórios e políticas de recrutamento...
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/10 p-4 text-xs leading-5 text-[#FCA5A5]">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#34D399]/30 bg-[#34D399]/10 p-4 text-xs leading-5 text-[#A7F3D0]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {(snapshot?.warnings || []).map((warning) => (
            <div key={warning} className="mb-3 rounded-xl border border-[#FBBF24]/20 bg-[#FBBF24]/5 px-4 py-3 text-[11px] text-[#D8BE79]">
              {warning}
            </div>
          ))}

          {pendingOffers.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <BadgeCheck size={18} className="text-[#34D399]" />
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#6EE7B7]">Propostas formais</span>
                  <h3 className="text-base font-black text-[#EAF7F1]">Você pode assinar um novo vínculo agora</h3>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {pendingOffers.map((offer) => (
                  <article key={offer.id} className="rounded-2xl border border-[#315246] bg-[#101915] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-[#34D399]/25 bg-[#34D399]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#6EE7B7]">
                        {offerTypeLabel(offer.offerType)}
                      </span>
                      {offer.expiresGameDate && (
                        <span className="flex items-center gap-1 text-[10px] text-[#87958F]"><Clock3 size={12} /> até {offer.expiresGameDate.split('-').reverse().join('/')}</span>
                      )}
                    </div>
                    <h4 className="mt-3 font-serif text-xl font-black text-[#EDF7F2]">{offer.terms.officeName}</h4>
                    <p className="mt-1 text-sm font-bold text-[#9FBBB0]">{offer.terms.roleTitle}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-[#293D35] bg-[#0C120F] p-3"><span className="block text-[#73827B]">Salário</span><strong className="mt-1 block text-[#E5EFEA]">JR$ {formatMoney(offer.terms.salaryMonthlyJR)}/mês</strong></div>
                      <div className="rounded-xl border border-[#293D35] bg-[#0C120F] p-3"><span className="block text-[#73827B]">Jornada</span><strong className="mt-1 block text-[#E5EFEA]">{offer.terms.weeklyHours}h/semana</strong></div>
                      <div className="rounded-xl border border-[#293D35] bg-[#0C120F] p-3"><span className="block text-[#73827B]">Regime</span><strong className="mt-1 block text-[#E5EFEA]">{offer.terms.workRegime}</strong></div>
                      <div className="rounded-xl border border-[#293D35] bg-[#0C120F] p-3"><span className="block text-[#73827B]">Exclusividade</span><strong className="mt-1 block text-[#E5EFEA]">{offer.terms.exclusiveDedication ? 'Sim' : 'Não'}</strong></div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        disabled={busyId === offer.id}
                        onClick={() => void decline(offer)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#4B3437] px-4 py-3 text-xs font-black text-[#FCA5A5] disabled:opacity-40"
                      >
                        <XCircle size={15} /> Recusar
                      </button>
                      <button
                        type="button"
                        disabled={busyId === offer.id}
                        onClick={() => void accept(offer)}
                        className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#2E765E] px-4 py-3 text-xs font-black text-white disabled:opacity-40"
                      >
                        <ShieldCheck size={15} /> Assinar contrato
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7D8794]">Escritórios publicados</span>
              <h3 className="mt-1 text-base font-black text-[#ECEEF1]">Onde sua carreira pode continuar</h3>
            </div>

            {snapshot && snapshot.firms.length === 0 ? (
              <div className="rounded-2xl border border-[#2C323A] bg-[#12151A] p-6 text-sm text-[#8D949E]">
                Nenhum escritório publicado está disponível no catálogo. Crie e publique novos escritórios pelo Rota Admin.
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {(snapshot?.firms || []).map((firm) => {
                  const pending = pendingOfferForFirm(snapshot?.offers || [], firm.id);
                  const application = evaluateMarketPolicy(player, firm, 'applications');
                  const postTermination = evaluateMarketPolicy(player, firm, 'postTermination');
                  const isCurrent = employment?.officeId === firm.id || employment?.officeSlug === firm.slug;
                  const role = pending
                    ? firm.roles.find((item) => item.id === pending.roleId) || application.role || postTermination.role
                    : application.role || postTermination.role;

                  return (
                    <article key={firm.id} className="rounded-2xl border border-[#2B3037] bg-[#13161B] p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#60A5FA]/20 bg-[#60A5FA]/10 text-[#93C5FD]">
                          <Building2 size={21} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-serif text-lg font-black text-[#ECEEF1]">{firm.name}</h4>
                            {isCurrent && <span className="rounded-full bg-[#34D399]/10 px-2 py-1 text-[9px] font-black uppercase text-[#6EE7B7]">Empregador atual</span>}
                          </div>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#7E8793]">
                            {marketTierLabel(firm.marketTier)} • {sizeLabel(firm.sizeCategory)} • prestígio {firm.prestige}/100
                          </p>
                          {firm.description && <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#9197A1]">{firm.description}</p>}
                        </div>
                      </div>

                      {role && (
                        <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                          <div className="rounded-xl border border-[#282E35] bg-[#0E1115] p-3"><span className="block text-[#727A84]">Cargo possível</span><strong className="mt-1 block text-[#DCE1E7]">{role.title}</strong></div>
                          <div className="rounded-xl border border-[#282E35] bg-[#0E1115] p-3"><span className="block text-[#727A84]">Remuneração</span><strong className="mt-1 block text-[#DCE1E7]">JR$ {formatMoney(role.salaryMonthlyJR)}</strong></div>
                          <div className="rounded-xl border border-[#282E35] bg-[#0E1115] p-3"><span className="block text-[#727A84]">Jornada</span><strong className="mt-1 block text-[#DCE1E7]">{role.weeklyHours}h</strong></div>
                        </div>
                      )}

                      {!isCurrent && !pending && (
                        <div className="mt-4">
                          {application.eligible ? (
                            <button
                              type="button"
                              disabled={busyId === firm.id}
                              onClick={() => void apply(firm)}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#60A5FA]/35 bg-[#60A5FA]/10 px-4 py-3 text-xs font-black text-[#A9CCFF] transition hover:bg-[#60A5FA]/15 disabled:opacity-40"
                            >
                              <Send size={15} /> Enviar candidatura <ArrowRight size={14} />
                            </button>
                          ) : (
                            <div className="rounded-xl border border-[#343239] bg-[#111116] p-3 text-[10px] leading-5 text-[#85858D]">
                              <strong className="block text-[#AAA8AE]">Candidatura indisponível agora</strong>
                              {application.reasons.slice(0, 3).join(' ')}
                            </div>
                          )}
                        </div>
                      )}

                      {!isCurrent && pending && (
                        <div className="mt-4 rounded-xl border border-[#34D399]/20 bg-[#34D399]/5 px-3 py-2.5 text-[10px] font-bold text-[#86D8B9]">
                          Já existe uma proposta deste escritório aguardando sua decisão.
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};

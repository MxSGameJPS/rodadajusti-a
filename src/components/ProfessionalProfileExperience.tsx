import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Briefcase,
  Eye,
  Gavel,
  Lock,
  MessageCircle,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import type { PlayerProfile } from '../types/game';
import {
  ATTRIBUTE_CONFIG,
  ATTRIBUTE_ORDER,
  allocateProfessionalXp,
  getCharacterBand,
  getEffectiveAttributeLevel,
  getNextAttributeLevelCost,
  loadProfessionalProfile,
  readCurrentPlayerSnapshot,
  saveProfessionalProfile,
  syncProfessionalProfileWithPlayer,
  type ProfessionalAttributeId,
  type ProfessionalRpgProfile,
} from '../lib/professionalRpg';
import { usePlayerDisplayName } from '../lib/playerTreatment';
import { sound } from '../utils/sound';

const ATTRIBUTE_ICONS: Record<ProfessionalAttributeId, React.ReactNode> = {
  LEGAL_KNOWLEDGE: <Gavel size={19} />,
  INVESTIGATION: <Search size={19} />,
  PERCEPTION: <Eye size={19} />,
  PERSUASION: <MessageCircle size={19} />,
  INFLUENCE: <Users size={19} />,
  SELF_CONTROL: <Brain size={19} />,
};

function formatXp(value: number) {
  return `${Math.max(0, Math.floor(value)).toLocaleString('pt-BR')} XP`;
}

export const ProfessionalProfileExperience: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [profile, setProfile] = useState<ProfessionalRpgProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const displayName = usePlayerDisplayName(player, 'Profissional');

  useEffect(() => {
    let active = true;

    const sync = () => {
      const currentPlayer = readCurrentPlayerSnapshot();
      if (!active || !currentPlayer?.oabRegistration) return;

      const existedBefore = Boolean(loadProfessionalProfile(currentPlayer));
      const syncedProfile = syncProfessionalProfileWithPlayer(currentPlayer);
      if (!syncedProfile || !active) return;

      setPlayer(currentPlayer);
      setProfile(syncedProfile);
      if (!existedBefore) setIsOpen(true);
    };

    sync();
    const timer = window.setInterval(sync, 900);

    const openProfile = () => {
      sync();
      setIsOpen(true);
    };
    const profileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfessionalRpgProfile>).detail;
      if (detail) setProfile(detail);
    };
    const profileUnlocked = (event: Event) => {
      const detail = (event as CustomEvent<ProfessionalRpgProfile>).detail;
      if (detail) {
        setProfile(detail);
        setIsOpen(true);
      }
    };

    window.addEventListener('rota:open-professional-profile', openProfile);
    window.addEventListener('rota:professional-profile-updated', profileUpdated);
    window.addEventListener('rota:professional-profile-unlocked', profileUnlocked);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('rota:open-professional-profile', openProfile);
      window.removeEventListener('rota:professional-profile-updated', profileUpdated);
      window.removeEventListener('rota:professional-profile-unlocked', profileUnlocked);
    };
  }, []);

  const professionalLevel = useMemo(() => {
    if (!profile) return 0;
    const total = ATTRIBUTE_ORDER.reduce((sum, id) => sum + getEffectiveAttributeLevel(profile, id), 0);
    return Math.max(1, Math.round(total / ATTRIBUTE_ORDER.length));
  }, [profile]);

  if (!player || !profile) return null;

  const invest = (attributeId: ProfessionalAttributeId, amount: number) => {
    sound.playClick();
    const next = allocateProfessionalXp(profile, attributeId, amount);
    if (next === profile) return;
    saveProfessionalProfile(player, next);
    setProfile(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          sound.playClick();
          setIsOpen(true);
        }}
        className="fixed bottom-5 left-4 z-[70] flex items-center gap-2 rounded-2xl border border-[#60A5FA]/40 bg-[#111113]/95 px-3 py-2.5 text-left shadow-2xl backdrop-blur-md transition-all hover:border-[#60A5FA] hover:bg-[#17171A] sm:left-6 sm:px-4 sm:py-3"
        title="Abrir Perfil Profissional"
        aria-label="Abrir Perfil Profissional"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#93C5FD]">
          <User size={19} />
        </div>
        <div className="hidden sm:block">
          <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-[#7D91B3]">RPG profissional</span>
          <strong className="block text-xs text-[#E8EDF7]">Perfil & Atributos</strong>
          {profile.availableXp > 0 && (
            <span className="block text-[9px] font-bold text-[#C5A059]">{formatXp(profile.availableXp)} para distribuir</span>
          )}
        </div>
        {profile.availableXp > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C5A059] px-1 text-[8px] font-black text-[#0A0A0B] sm:hidden">
            +
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-[#050506]/90 p-2 backdrop-blur-md sm:p-5">
          <div className="my-3 flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#34343A] bg-[#101012] shadow-2xl sm:my-5">
            <header className="flex items-center justify-between gap-3 border-b border-[#2A2A2E] bg-[#151517] px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#60A5FA]/35 bg-[#60A5FA]/10 text-[#93C5FD]">
                  <User size={23} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#60A5FA]">Ficha profissional desbloqueada pela OAB</span>
                  <h2 className="truncate font-serif text-lg font-black text-[#F2F0EB] sm:text-2xl">{displayName} • Perfil RPG</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsOpen(false);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#303036] text-[#999] transition-colors hover:border-[#F87171]/50 hover:text-[#F87171]"
                aria-label="Fechar Perfil Profissional"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
                <section className="space-y-4">
                  <div className="rounded-2xl border border-[#C5A059]/30 bg-gradient-to-br from-[#C5A059]/10 to-[#151517] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-2 text-[#C5A059]">
                          <Sparkles size={16} />
                          <span className="text-[9px] font-black uppercase tracking-[0.18em]">Desenvolvimento profissional</span>
                        </div>
                        <h3 className="font-serif text-xl font-black text-[#F1EFE9]">Nível profissional {professionalLevel}</h3>
                        <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#A9A6A0]">
                          A sua ficha nasceu do desempenho na OAB e da trajetória de estágio. A partir de agora, o XP obtido em casos também pode ser distribuído livremente entre os atributos.
                        </p>
                      </div>
                      <div className="min-w-[170px] rounded-xl border border-[#C5A059]/35 bg-[#0C0C0E] p-4 text-center">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-[#8E846D]">XP disponível</span>
                        <strong className="mt-1 block font-mono text-2xl font-black text-[#E9C978]">{formatXp(profile.availableXp)}</strong>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                      <div className="rounded-lg border border-[#2D2D32] bg-[#121214] p-3">
                        <span className="block uppercase text-[#777]">OAB</span>
                        <strong className="text-[#E6E6E9]">{profile.source.examScore}/{profile.source.examTotalQuestions}</strong>
                      </div>
                      <div className="rounded-lg border border-[#2D2D32] bg-[#121214] p-3">
                        <span className="block uppercase text-[#777]">Desempenho</span>
                        <strong className="text-[#93C5FD]">{profile.source.examPercentage.toFixed(1)}%</strong>
                      </div>
                      <div className="rounded-lg border border-[#2D2D32] bg-[#121214] p-3">
                        <span className="block uppercase text-[#777]">Casos vencidos</span>
                        <strong className="text-[#34D399]">{player.casesSolved}</strong>
                      </div>
                      <div className="rounded-lg border border-[#2D2D32] bg-[#121214] p-3">
                        <span className="block uppercase text-[#777]">Reputação</span>
                        <strong className="text-[#C5A059]">{player.reputation}/100</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Briefcase size={17} className="text-[#60A5FA]" />
                      <h3 className="font-serif text-base font-black text-[#EBEBEE]">Atributos profissionais</h3>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {ATTRIBUTE_ORDER.map((attributeId) => {
                        const attribute = profile.attributes[attributeId];
                        const config = ATTRIBUTE_CONFIG[attributeId];
                        const nextCost = getNextAttributeLevelCost(attribute.level);
                        const effectiveLevel = getEffectiveAttributeLevel(profile, attributeId);
                        const missingToLevel = nextCost == null ? 0 : Math.max(0, nextCost - attribute.xp);
                        const progress = nextCost == null ? 100 : Math.round((attribute.xp / nextCost) * 100);
                        const hasModifier = effectiveLevel !== attribute.level;

                        return (
                          <article key={attributeId} className="rounded-2xl border border-[#303036] bg-[#161618] p-4 shadow-lg">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/10 text-[#93C5FD]">
                                {ATTRIBUTE_ICONS[attributeId]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-black text-[#ECECEF]">{config.label}</h4>
                                  <span className="rounded-lg border border-[#C5A059]/25 bg-[#C5A059]/10 px-2 py-1 font-mono text-[10px] font-black text-[#E6C675]">
                                    NV {effectiveLevel}
                                  </span>
                                </div>
                                <p className="mt-1 text-[10px] leading-relaxed text-[#888890]">{config.description}</p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="mb-1.5 flex items-center justify-between text-[9px] font-mono text-[#777]">
                                <span>{nextCost == null ? 'Nível máximo' : `${attribute.xp}/${nextCost} XP neste nível`}</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[#29292E]">
                                <div className="h-full rounded-full bg-[#60A5FA] transition-all" style={{ width: `${Math.max(nextCost == null ? 100 : 4, progress)}%` }} />
                              </div>
                              {hasModifier && (
                                <p className="mt-1.5 text-[9px] font-semibold text-[#FBBF24]">Base {attribute.level} • modificador ativo {effectiveLevel > attribute.level ? '+' : ''}{effectiveLevel - attribute.level}</p>
                              )}
                            </div>

                            {attribute.level < 10 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  disabled={profile.availableXp <= 0}
                                  onClick={() => invest(attributeId, Math.min(25, profile.availableXp))}
                                  className="rounded-lg border border-[#34343A] bg-[#202024] px-2 py-2 text-[9px] font-bold text-[#C8C8CC] transition-colors hover:border-[#60A5FA]/45 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  +25 XP
                                </button>
                                <button
                                  type="button"
                                  disabled={profile.availableXp <= 0}
                                  onClick={() => invest(attributeId, Math.min(100, profile.availableXp))}
                                  className="rounded-lg border border-[#34343A] bg-[#202024] px-2 py-2 text-[9px] font-bold text-[#C8C8CC] transition-colors hover:border-[#60A5FA]/45 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  +100 XP
                                </button>
                                <button
                                  type="button"
                                  disabled={profile.availableXp <= 0 || missingToLevel <= 0}
                                  onClick={() => invest(attributeId, Math.min(missingToLevel, profile.availableXp))}
                                  className="rounded-lg border border-[#C5A059]/35 bg-[#C5A059]/10 px-2 py-2 text-[9px] font-black text-[#E5C675] transition-colors hover:bg-[#C5A059]/15 disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                  Completar
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <section className="rounded-2xl border border-[#34343A] bg-[#151517] p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Scale size={18} className="text-[#C5A059]" />
                      <h3 className="font-serif text-base font-black text-[#EBEBEE]">Conduta</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[10px]">
                          <span className="font-bold text-[#CFCFD3]">Ética profissional</span>
                          <span className="font-mono font-black text-[#34D399]">{profile.ethics}/100</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#29292E]">
                          <div className="h-full rounded-full bg-[#34D399]" style={{ width: `${profile.ethics}%` }} />
                        </div>
                        <p className="mt-1.5 text-[9px] leading-relaxed text-[#777]">Pode subir ou cair conforme decisões profissionais, clientes, conflitos e escolhas durante os casos.</p>
                      </div>

                      <div className="rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/[0.06] p-4">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#9D8B62]">Índole</span>
                        <strong className="mt-1 block font-serif text-xl font-black text-[#E8D29D]">{getCharacterBand(profile.character)}</strong>
                        <p className="mt-1 text-[9px] leading-relaxed text-[#8F856D]">A índole muda mais lentamente que a ética e representa padrões repetidos de comportamento. O valor numérico fica oculto.</p>
                      </div>

                      <div className="rounded-xl border border-[#F87171]/20 bg-[#F87171]/[0.04] p-4">
                        <div className="flex items-center gap-2 text-[#FCA5A5]">
                          <Lock size={15} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Risco de exposição</span>
                        </div>
                        <strong className="mt-2 block text-sm font-black text-[#D3D3D7]">INFORMAÇÃO OCULTA</strong>
                        <p className="mt-1 text-[9px] leading-relaxed text-[#81777A]">O jogo acompanha silenciosamente consequências, testemunhas, rastros e decisões questionáveis. Você nunca verá a porcentagem real de risco.</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#34343A] bg-[#151517] p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldCheck size={17} className="text-[#60A5FA]" />
                      <h3 className="font-serif text-base font-black text-[#EBEBEE]">Traços adquiridos</h3>
                    </div>
                    {profile.traits.length === 0 ? (
                      <p className="text-xs text-[#777]">Sua trajetória ainda não gerou traços permanentes.</p>
                    ) : (
                      <div className="space-y-2">
                        {profile.traits.map((trait) => (
                          <div
                            key={trait.id}
                            className={`rounded-xl border p-3 ${
                              trait.polarity === 'negative'
                                ? 'border-[#F87171]/25 bg-[#F87171]/[0.05]'
                                : trait.polarity === 'mixed'
                                  ? 'border-[#FBBF24]/25 bg-[#FBBF24]/[0.05]'
                                  : 'border-[#34D399]/25 bg-[#34D399]/[0.05]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${trait.polarity === 'negative' ? 'bg-[#F87171]' : trait.polarity === 'mixed' ? 'bg-[#FBBF24]' : 'bg-[#34D399]'}`} />
                              <strong className="text-xs text-[#E4E4E7]">{trait.name}</strong>
                            </div>
                            <p className="mt-1 text-[9px] leading-relaxed text-[#888]">{trait.description}</p>
                            <span className="mt-1.5 block text-[8px] uppercase tracking-wider text-[#666]">{trait.source}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {profile.modifiers.length > 0 && (
                    <section className="rounded-2xl border border-[#FBBF24]/25 bg-[#FBBF24]/[0.04] p-5">
                      <div className="mb-3 flex items-center gap-2 text-[#FBBF24]">
                        <Sparkles size={16} />
                        <h3 className="font-serif text-sm font-black">Modificadores temporários</h3>
                      </div>
                      <div className="space-y-2">
                        {profile.modifiers.map((modifier) => (
                          <div key={modifier.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#3A3422] bg-[#17150F] p-3 text-[10px]">
                            <div>
                              <strong className="text-[#DDD4B5]">{modifier.label}</strong>
                              <span className="mt-0.5 block text-[#827B63]">{ATTRIBUTE_CONFIG[modifier.attributeId].label}</span>
                            </div>
                            <span className="font-mono font-black text-[#FBBF24]">{modifier.amount > 0 ? '+' : ''}{modifier.amount}{modifier.remainingCases != null ? ` • ${modifier.remainingCases} caso(s)` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </div>

            <footer className="flex items-start gap-3 border-t border-[#2A2A2E] bg-[#0D0D0F] px-4 py-3 text-[10px] leading-relaxed text-[#777] sm:px-6">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#60A5FA]" />
              <p>
                Os atributos aumentam possibilidades e modificam testes internos, mas não garantem vitória em processos nem impunidade em decisões ilegais. Ética, índole, exposição, traços e modificadores podem mudar positiva ou negativamente ao longo da carreira.
              </p>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

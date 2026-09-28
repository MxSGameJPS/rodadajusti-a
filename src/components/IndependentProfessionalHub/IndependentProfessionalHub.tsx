import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Laptop,
  Megaphone,
  Search,
  Smartphone,
  UserRoundSearch,
} from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import {
  getSocialMediaLeadCase,
  hydrateIndependentPracticeState,
  isSocialJuridicoProActive,
  readIndependentPracticeState,
  runSocialMediaCampaign,
  SOCIAL_JURIDICO_PRO_MONTHLY_PRICE,
  SOCIAL_MEDIA_CAMPAIGN_COST,
  startIndependentMarketplaceCase,
} from '../../lib/independentPractice';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
import { LawFirmMarketModal } from '../LawFirmMarket/LawFirmMarketModal';
import { ProfessionalDailyBrief } from '../ProfessionalOfficeHub/ProfessionalDailyBrief';

const OPEN_SOCIAL_JURIDICO_EVENT = 'rota:open-social-juridico';
const OPEN_PHONE_EVENT = 'rota:open-professional-phone';

interface IndependentProfessionalHubProps {
  player: PlayerProfile;
  onResumeActiveCase: () => void;
  onOpenCareerModal: () => void;
  onOpenAcademicModal: () => void;
  onOpenConcursoModal: () => void;
}

export const IndependentProfessionalHub: React.FC<IndependentProfessionalHubProps> = ({
  player,
  onResumeActiveCase,
  onOpenCareerModal,
  onOpenAcademicModal,
  onOpenConcursoModal,
}) => {
  const displayName = usePlayerDisplayName(player, 'Advogado');
  const [practiceRevision, setPracticeRevision] = useState(0);
  const practice = useMemo(() => readIndependentPracticeState(player), [player, practiceRevision]);
  const sjActive = isSocialJuridicoProActive(player, practice);
  const activeCase = GAME_CASES.find((item) => item.id === player.activeCase?.caseId) || null;
  const socialMediaLead = getSocialMediaLeadCase(player, GAME_CASES);
  const [socialNotice, setSocialNotice] = useState('');
  useEffect(() => {
    let active = true;
    void hydrateIndependentPracticeState(player).then(() => {
      if (active) setPracticeRevision((value) => value + 1);
    });
    return () => { active = false; };
  }, [player.cloudCareerId, player.oabRegistration?.code]);
  const [showJobMarket, setShowJobMarket] = useState(false);
  useEffect(() => {
    const openMarket = () => setShowJobMarket(true);
    window.addEventListener('rota:open-law-firm-market', openMarket);
    return () => window.removeEventListener('rota:open-law-firm-market', openMarket);
  }, []);

  const officeStatus = useMemo(() => {
    if (player.officeFinances.isOfficeOpen) return player.officeFinances.officeName;
    return 'Sem escritório próprio';
  }, [player.officeFinances.isOfficeOpen, player.officeFinances.officeName]);

  const openDevice = (eventName: string) => {
    sound.playClick();
    window.dispatchEvent(new CustomEvent(eventName));
  };

  const promoteOnSocialMedia = () => {
    setSocialNotice('');
    sound.playClick();
    const result = runSocialMediaCampaign(player);
    if (!result.ok) {
      const messages: Record<string, string> = {
        MONEY: `Saldo insuficiente. A divulgação custa ${SOCIAL_MEDIA_CAMPAIGN_COST} JR.`,
        COOLDOWN: 'Você já fez uma ação de divulgação hoje. Avance o dia para publicar uma nova campanha.',
        BLOCKED: 'Sua situação disciplinar atual impede captação de novos clientes.',
        EMPLOYED: 'Esta captação é exclusiva da atuação autônoma.',
        STORAGE: 'Não foi possível registrar a divulgação.',
      };
      setSocialNotice(messages[result.reason] || 'Não foi possível divulgar seu trabalho.');
      return;
    }
    setSocialNotice(`Campanha publicada. Visibilidade +${result.visibilityGain} e uma nova oportunidade de contato foi gerada.`);
    setPracticeRevision((value) => value + 1);
  };

  const acceptSocialMediaLead = () => {
    if (!socialMediaLead || player.activeCase) return;
    setSocialNotice('');
    sound.playPaper();
    if (!startIndependentMarketplaceCase(player, socialMediaLead, 'SOCIAL_MEDIA')) {
      setSocialNotice('Não foi possível converter este contato em atendimento.');
      return;
    }
    window.location.reload();
  };

  const openOfficeManagement = () => { sound.playClick(); window.dispatchEvent(new CustomEvent('rota:open-office-management')); };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#3A3030] bg-[linear-gradient(135deg,#171113,#101113_58%,#11161A)] p-5 shadow-2xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#FBBF24]">
              <BriefcaseBusiness size={27} />
            </div>
            <div>
              <div className="mb-2 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.16em]">
                <span className="rounded-full border border-[#F87171]/30 bg-[#F87171]/10 px-2.5 py-1 text-[#FCA5A5]">{player.officeDiscipline?.employmentStatus === 'TERMINATED' ? 'Vínculo anterior encerrado' : 'Sem vínculo com escritório'}</span>
                <span className="rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-2.5 py-1 text-[#93C5FD]">Advocacia independente</span>
              </div>
              <h2 className="font-serif text-2xl font-black text-[#F3F0E9]">Agora a carreira depende de você, {displayName}.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#AAA6A0]">
                Você está atuando sem vínculo com um escritório. Sua carteira depende da sua própria captação: Social Jurídico, presença profissional nas redes sociais, indicações e reputação. Você continua livre para receber propostas ou se candidatar a outros escritórios.
              </p>
            </div>
          </div>
          <div className="min-w-[210px] rounded-2xl border border-[#2D333A] bg-[#0D1014] p-4">
            <span className="block text-[9px] font-black uppercase tracking-wider text-[#777D86]">Situação profissional</span>
            <strong className="mt-1 block text-sm text-[#E8E8EA]">{officeStatus}</strong>
            <small className="mt-1 block text-[10px] leading-4 text-[#777D86]">OAB ativa • sem vínculo empregatício com o antigo escritório</small>
          </div>
        </div>
      </section>

      <ProfessionalDailyBrief player={player} onResumeActiveCase={onResumeActiveCase} />

      <section className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => openDevice(OPEN_SOCIAL_JURIDICO_EVENT)}
          className="group flex min-h-[190px] items-start gap-4 rounded-2xl border border-[#2D2D32] bg-[#151517] p-5 text-left transition hover:border-[#C5A059]/55 hover:bg-[#19191C]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/10 text-[#C5A059]"><Laptop size={25} /></div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-[#8C877D]">Conta agora é pessoal</span>
            <h3 className="mt-1 text-lg font-black text-[#F0EEE9]">Notebook • Social Jurídico</h3>
            <p className="mt-2 text-xs leading-5 text-[#8F8F95]">
              {sjActive
                ? 'Seu plano Pro está ativo. Abra o CRM pessoal para consultar oportunidades disponíveis na plataforma.'
                : `O acesso Enterprise pertencia ao Ramos & Associados. Para continuar usando CRM e ferramentas, o plano Pro custa ${SOCIAL_JURIDICO_PRO_MONTHLY_PRICE} JR por mês.`}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-black text-[#C5A059]">Abrir notebook <ArrowRight size={14} /></div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openDevice(OPEN_PHONE_EVENT)}
          className="group flex min-h-[190px] items-start gap-4 rounded-2xl border border-[#2D2D32] bg-[#151517] p-5 text-left transition hover:border-[#60A5FA]/45 hover:bg-[#19191C]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/10 text-[#60A5FA]"><Smartphone size={25} /></div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-[#7D8790]">Sua rede de contatos continua</span>
            <h3 className="mt-1 text-lg font-black text-[#F0EEE9]">Celular</h3>
            <p className="mt-2 text-xs leading-5 text-[#8F8F95]">O aparelho continua sendo seu canal pessoal e profissional. Clientes próprios, contatos e vida social não dependem do antigo escritório.</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-black text-[#60A5FA]">Abrir celular <ArrowRight size={14} /></div>
          </div>
        </button>
      </section>

      {activeCase && player.activeCase ? (
        <section className="rounded-2xl border border-[#36554A] bg-[#0F1714] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6EE7B7]">Atendimento independente em andamento</span>
              <h3 className="mt-1 font-serif text-xl font-black text-[#EAF7F1]">{activeCase.title}</h3>
              <p className="mt-1 text-xs text-[#8EAAA0]">{activeCase.code} • {activeCase.client.name}</p>
            </div>
            <button type="button" onClick={onResumeActiveCase} className="rounded-xl bg-[#2E765E] px-4 py-3 text-xs font-black text-white">Continuar diligências</button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#34343A] bg-[#121214] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#FBBF24]" />
            <div>
              <h3 className="font-black text-[#E8E6E1]">Você não recebe mais casos do Ramos & Associados.</h3>
              <p className="mt-1 text-xs leading-5 text-[#8C8C92]">Novos atendimentos do antigo escritório estão bloqueados. Assinantes do Social Jurídico Pro podem receber oportunidades da plataforma; sem assinatura, a carreira depende de captação própria e futuras oportunidades externas.</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#334155] bg-[#11151B] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#60A5FA]/25 bg-[#60A5FA]/10 text-[#93C5FD]"><Megaphone size={21} /></div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#7FA8DC]">Captação própria • redes sociais</span>
              <h3 className="mt-1 text-base font-black text-[#E8EEF7]">Construa sua presença profissional</h3>
              <p className="mt-1 text-xs leading-5 text-[#8D99A8]">Visibilidade {practice.socialMediaVisibility}/100 • {practice.socialMediaLeadCredits} contato(s) disponível(is). Uma campanha por dia do jogo, com custo de {SOCIAL_MEDIA_CAMPAIGN_COST} JR.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={promoteOnSocialMedia} className="rounded-xl border border-[#3B526E] px-4 py-3 text-xs font-black text-[#93C5FD]">Divulgar nas redes</button>
            {socialMediaLead && !player.activeCase && (
              <button type="button" onClick={acceptSocialMediaLead} className="rounded-xl bg-[#2E765E] px-4 py-3 text-xs font-black text-white">Atender contato captado</button>
            )}
          </div>
        </div>
        {socialMediaLead && !player.activeCase && <p className="mt-3 rounded-xl border border-[#315246] bg-[#0D1713] p-3 text-xs text-[#A7D7C4]">Novo contato: <strong>{socialMediaLead.client.name}</strong> • {socialMediaLead.title}</p>}
        {socialNotice && <p className="mt-3 text-xs font-bold text-[#D6DEE8]">{socialNotice}</p>}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => openDevice(OPEN_SOCIAL_JURIDICO_EVENT)} className="rounded-2xl border border-[#2B2B30] bg-[#141416] p-4 text-left">
          <Search size={19} className="text-[#C5A059]" />
          <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#777]">Casos</span>
          <strong className="mt-1 block text-sm text-[#E6E3DC]">Buscar oportunidades no Social Jurídico</strong>
        </button>
        <button type="button" onClick={() => setShowJobMarket(true)} className="rounded-2xl border border-[#2B2B30] bg-[#141416] p-4 text-left transition hover:border-[#60A5FA]/35">
          <UserRoundSearch size={19} className="text-[#60A5FA]" />
          <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#777]">Mercado de trabalho</span>
          <strong className="mt-1 block text-sm text-[#E6E3DC]">Buscar outro escritório</strong>
        </button>
        <button type="button" onClick={openOfficeManagement} className="rounded-2xl border border-[#2B2B30] bg-[#141416] p-4 text-left transition hover:border-[#34D399]/35">
          <Building2 size={19} className="text-[#34D399]" />
          <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#777]">Autonomia</span>
          <strong className="mt-1 block text-sm text-[#E6E3DC]">{player.officeFinances.isOfficeOpen ? 'Administrar escritório próprio' : 'Procurar imóvel e abrir escritório'}</strong>
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={onOpenCareerModal} className="rounded-xl border border-[#2A2A2E] bg-[#111113] px-4 py-3 text-xs font-bold text-[#BDBDBF]">Plano de carreira</button>
        <button type="button" onClick={onOpenAcademicModal} className="rounded-xl border border-[#2A2A2E] bg-[#111113] px-4 py-3 text-xs font-bold text-[#BDBDBF]">Carreira acadêmica</button>
        <button type="button" onClick={onOpenConcursoModal} className="rounded-xl border border-[#2A2A2E] bg-[#111113] px-4 py-3 text-xs font-bold text-[#BDBDBF]">Magistratura</button>
      </section>


      <LawFirmMarketModal
        player={player}
        isOpen={showJobMarket}
        onClose={() => setShowJobMarket(false)}
        onAccepted={() => setShowJobMarket(false)}
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Laptop,
  Search,
  Smartphone,
  UserRoundSearch,
  X,
} from 'lucide-react';
import { GAME_CASES } from '../../data/cases';
import {
  isSocialJuridicoProActive,
  openOwnOffice,
  readIndependentPracticeState,
  SOCIAL_JURIDICO_PRO_MONTHLY_PRICE,
} from '../../lib/independentPractice';
import { usePlayerDisplayName } from '../../lib/playerTreatment';
import type { PlayerProfile } from '../../types/game';
import { sound } from '../../utils/sound';
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
  const practice = readIndependentPracticeState(player);
  const sjActive = isSocialJuridicoProActive(player, practice);
  const activeCase = GAME_CASES.find((item) => item.id === player.activeCase?.caseId) || null;
  const [showOfficeSetup, setShowOfficeSetup] = useState(false);
  const [officeName, setOfficeName] = useState(player.officeFinances.officeName || `${player.name} Advocacia`);
  const [officeError, setOfficeError] = useState('');

  const officeStatus = useMemo(() => {
    if (player.officeFinances.isOfficeOpen) return player.officeFinances.officeName;
    return 'Sem escritório próprio';
  }, [player.officeFinances.isOfficeOpen, player.officeFinances.officeName]);

  const openDevice = (eventName: string) => {
    sound.playClick();
    window.dispatchEvent(new CustomEvent(eventName));
  };

  const confirmOwnOffice = () => {
    setOfficeError('');
    if (!officeName.trim()) {
      setOfficeError('Informe um nome para o seu escritório.');
      return;
    }
    sound.playStamp();
    if (!openOwnOffice(player, officeName)) {
      setOfficeError('Não foi possível registrar o escritório no save local.');
      return;
    }
    window.location.reload();
  };

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
                <span className="rounded-full border border-[#F87171]/30 bg-[#F87171]/10 px-2.5 py-1 text-[#FCA5A5]">Vínculo encerrado • Ramos & Associados</span>
                <span className="rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-2.5 py-1 text-[#93C5FD]">Advocacia independente</span>
              </div>
              <h2 className="font-serif text-2xl font-black text-[#F3F0E9]">Agora a carreira depende de você, {displayName}.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#AAA6A0]">
                Seu contrato com o Ramos & Associados foi encerrado. O escritório não pode mais distribuir clientes, recursos ou novos casos para você. A partir daqui, você precisa captar clientes, buscar outra colocação, assinar ferramentas por conta própria ou abrir seu próprio escritório.
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

      <section className="grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => openDevice(OPEN_SOCIAL_JURIDICO_EVENT)} className="rounded-2xl border border-[#2B2B30] bg-[#141416] p-4 text-left">
          <Search size={19} className="text-[#C5A059]" />
          <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#777]">Casos</span>
          <strong className="mt-1 block text-sm text-[#E6E3DC]">Buscar oportunidades no Social Jurídico</strong>
        </button>
        <button type="button" className="rounded-2xl border border-[#2B2B30] bg-[#141416] p-4 text-left opacity-75">
          <UserRoundSearch size={19} className="text-[#60A5FA]" />
          <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#777]">Mercado de trabalho</span>
          <strong className="mt-1 block text-sm text-[#E6E3DC]">Buscar outro escritório • em expansão</strong>
        </button>
        <button type="button" onClick={() => setShowOfficeSetup(true)} className="rounded-2xl border border-[#2B2B30] bg-[#141416] p-4 text-left transition hover:border-[#34D399]/35">
          <Building2 size={19} className="text-[#34D399]" />
          <span className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#777]">Autonomia</span>
          <strong className="mt-1 block text-sm text-[#E6E3DC]">{player.officeFinances.isOfficeOpen ? 'Revisar escritório próprio' : 'Abrir meu próprio escritório'}</strong>
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={onOpenCareerModal} className="rounded-xl border border-[#2A2A2E] bg-[#111113] px-4 py-3 text-xs font-bold text-[#BDBDBF]">Plano de carreira</button>
        <button type="button" onClick={onOpenAcademicModal} className="rounded-xl border border-[#2A2A2E] bg-[#111113] px-4 py-3 text-xs font-bold text-[#BDBDBF]">Carreira acadêmica</button>
        <button type="button" onClick={onOpenConcursoModal} className="rounded-xl border border-[#2A2A2E] bg-[#111113] px-4 py-3 text-xs font-bold text-[#BDBDBF]">Magistratura</button>
      </section>

      {showOfficeSetup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#36554A] bg-[#111514] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#293C35] px-5 py-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6EE7B7]">Decisão de carreira</span>
                <h3 className="mt-1 font-serif text-xl font-black text-[#ECF7F2]">Abrir escritório próprio</h3>
              </div>
              <button type="button" onClick={() => setShowOfficeSetup(false)} className="rounded-lg p-2 text-[#8B9892] hover:bg-white/5"><X size={17} /></button>
            </header>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-[#3D453F] bg-[#161A18] p-4 text-xs leading-5 text-[#9EA8A3]">
                <strong className="block text-[#DDE9E3]">Você não precisa esperar virar sócio do Ramos & Associados para tentar a advocacia por conta própria.</strong>
                Abrir agora é possível, mas sua reputação atual continua pesando na capacidade de atrair bons clientes. Escritório próprio não garante demanda nem sucesso.
              </div>
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-[#7F8C86]">Nome do escritório</span>
                <input value={officeName} onChange={(event) => setOfficeName(event.target.value)} maxLength={80} className="w-full rounded-xl border border-[#36413C] bg-[#0B0E0D] px-4 py-3 text-sm text-[#EDF5F1] outline-none focus:border-[#34D399]/55" />
              </label>
              <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                <div className="rounded-xl border border-[#2D3531] bg-[#0E1110] p-3"><CheckCircle2 size={14} className="mb-1 text-[#34D399]" /><strong className="block text-[#DDE7E2]">Independência imediata</strong><span className="text-[#78817C]">Você administra sua própria estrutura.</span></div>
                <div className="rounded-xl border border-[#2D3531] bg-[#0E1110] p-3"><AlertTriangle size={14} className="mb-1 text-[#FBBF24]" /><strong className="block text-[#DDE7E2]">Risco comercial real</strong><span className="text-[#78817C]">Baixa reputação pode significar poucos clientes.</span></div>
              </div>
              {officeError && <p className="text-xs font-bold text-[#FCA5A5]">{officeError}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowOfficeSetup(false)} className="rounded-xl border border-[#343A37] px-4 py-3 text-xs font-bold text-[#A4AAA7]">Agora não</button>
                <button type="button" onClick={confirmOwnOffice} className="rounded-xl bg-[#2E765E] px-4 py-3 text-xs font-black text-white">{player.officeFinances.isOfficeOpen ? 'Salvar nome do escritório' : 'Abrir meu escritório'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

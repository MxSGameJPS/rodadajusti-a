import React, { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, Scale, ShieldAlert } from 'lucide-react';
import {
  getEthicalDilemmaDefinition,
  type EthicalDilemmaRecord,
} from '../lib/ethicalDilemmas';
import {
  applyProfessionalConsequence,
  getProfessionalOwnerKey,
  loadProfessionalProfile,
  readCurrentPlayerSnapshot,
  saveProfessionalProfile,
} from '../lib/professionalRpg';

const PLAYER_SAVE_KEY = 'rota_da_justica_save_v1';
const PENDING_NOTICE_KEY = 'rota_pending_misconduct_notice_v1';
const HANDLED_PREFIX = 'rota_misconduct_handled_v1:';
const MISCONDUCT_FINANCIAL_PENALTY = 2000;

interface MisconductNotice {
  version: 1;
  recordId: string;
  ownerKey: string;
  eventTitle: string;
  choiceLabel: string;
  ethicsLoss: number;
  characterLoss: number;
  financialPenalty: number;
  actualMoneyDeducted: number;
  remainingMoney: number;
  hasDisciplinaryIncident: boolean;
  createdAt: string;
}

function handledKey(ownerKey: string) {
  return `${HANDLED_PREFIX}${ownerKey}`;
}

function readHandled(ownerKey: string): string[] {
  try {
    const raw = localStorage.getItem(handledKey(ownerKey));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function markHandled(ownerKey: string, recordId: string) {
  const handled = readHandled(ownerKey);
  if (handled.includes(recordId)) return;
  localStorage.setItem(handledKey(ownerKey), JSON.stringify([...handled.slice(-99), recordId]));
}

function readPendingNotice(): MisconductNotice | null {
  try {
    const raw = localStorage.getItem(PENDING_NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MisconductNotice;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function savePendingNotice(notice: MisconductNotice) {
  localStorage.setItem(PENDING_NOTICE_KEY, JSON.stringify(notice));
}

function isMisconduct(record: EthicalDilemmaRecord) {
  const definition = getEthicalDilemmaDefinition(record.eventId);
  const choice = definition?.choices.find((item) => item.id === record.choiceId);
  if (!choice) return null;

  const ethicsDelta = choice.consequence.ethicsDelta ?? 0;
  const characterDelta = choice.consequence.characterDelta ?? 0;
  const misconduct =
    choice.tone === 'corrupt' ||
    ethicsDelta < 0 ||
    characterDelta < 0 ||
    Boolean(choice.incident);

  return misconduct ? { definition, choice, ethicsDelta, characterDelta } : null;
}

function applyMisconductConsequences(record: EthicalDilemmaRecord): MisconductNotice | null {
  const currentPlayer = readCurrentPlayerSnapshot();
  if (!currentPlayer) return null;

  const ownerKey = getProfessionalOwnerKey(currentPlayer);
  if (readHandled(ownerKey).includes(record.id)) return readPendingNotice();

  const misconduct = isMisconduct(record);
  if (!misconduct) return null;

  const currentProfile = loadProfessionalProfile(currentPlayer);
  if (!currentProfile) return null;

  // Toda conduta classificada como antiética precisa afetar tanto Ética quanto Índole.
  // Quando o dilema já aplicou a perda, não duplicamos; apenas garantimos a perda mínima de 1 ponto.
  const supplementalEthicsDelta = misconduct.ethicsDelta < 0 ? 0 : -1;
  const supplementalCharacterDelta = misconduct.characterDelta < 0 ? 0 : -1;

  if (supplementalEthicsDelta !== 0 || supplementalCharacterDelta !== 0) {
    const reinforcedProfile = applyProfessionalConsequence(currentProfile, {
      ethicsDelta: supplementalEthicsDelta,
      characterDelta: supplementalCharacterDelta,
    });
    saveProfessionalProfile(currentPlayer, reinforcedProfile);
  }

  let currentMoney = Math.max(0, Number(currentPlayer.money) || 0);
  const actualMoneyDeducted = Math.min(MISCONDUCT_FINANCIAL_PENALTY, currentMoney);
  const remainingMoney = Math.max(0, currentMoney - MISCONDUCT_FINANCIAL_PENALTY);

  try {
    const rawPlayer = localStorage.getItem(PLAYER_SAVE_KEY);
    if (rawPlayer) {
      const savedPlayer = JSON.parse(rawPlayer);
      currentMoney = Math.max(0, Number(savedPlayer.money) || 0);
      const realDeduction = Math.min(MISCONDUCT_FINANCIAL_PENALTY, currentMoney);
      savedPlayer.money = Math.max(0, currentMoney - MISCONDUCT_FINANCIAL_PENALTY);
      localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify(savedPlayer));

      const notice: MisconductNotice = {
        version: 1,
        recordId: record.id,
        ownerKey,
        eventTitle: misconduct.definition.title,
        choiceLabel: misconduct.choice.label,
        ethicsLoss: Math.max(1, -(misconduct.ethicsDelta + supplementalEthicsDelta)),
        characterLoss: Math.max(1, -(misconduct.characterDelta + supplementalCharacterDelta)),
        financialPenalty: MISCONDUCT_FINANCIAL_PENALTY,
        actualMoneyDeducted: realDeduction,
        remainingMoney: savedPlayer.money,
        hasDisciplinaryIncident: Boolean(misconduct.choice.incident),
        createdAt: new Date().toISOString(),
      };
      markHandled(ownerKey, record.id);
      savePendingNotice(notice);
      return notice;
    }
  } catch {
    // O modal continua sendo exibido mesmo se o cache financeiro local falhar.
  }

  const notice: MisconductNotice = {
    version: 1,
    recordId: record.id,
    ownerKey,
    eventTitle: misconduct.definition.title,
    choiceLabel: misconduct.choice.label,
    ethicsLoss: Math.max(1, -(misconduct.ethicsDelta + supplementalEthicsDelta)),
    characterLoss: Math.max(1, -(misconduct.characterDelta + supplementalCharacterDelta)),
    financialPenalty: MISCONDUCT_FINANCIAL_PENALTY,
    actualMoneyDeducted,
    remainingMoney,
    hasDisciplinaryIncident: Boolean(misconduct.choice.incident),
    createdAt: new Date().toISOString(),
  };
  markHandled(ownerKey, record.id);
  savePendingNotice(notice);
  return notice;
}

function formatMoney(value: number) {
  return `R$ ${Math.max(0, value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const MisconductConsequenceExperience: React.FC = () => {
  const [notice, setNotice] = useState<MisconductNotice | null>(null);

  useEffect(() => {
    const currentPlayer = readCurrentPlayerSnapshot();
    const restored = readPendingNotice();
    if (currentPlayer && restored && restored.ownerKey === getProfessionalOwnerKey(currentPlayer)) {
      setNotice(restored);
    }

    const handleResolved = (event: Event) => {
      const record = (event as CustomEvent<EthicalDilemmaRecord>).detail;
      if (!record) return;
      const nextNotice = applyMisconductConsequences(record);
      if (nextNotice) setNotice(nextNotice);
    };

    window.addEventListener('rota:ethical-dilemma-resolved', handleResolved);
    return () => window.removeEventListener('rota:ethical-dilemma-resolved', handleResolved);
  }, []);

  if (!notice) return null;

  const acknowledge = () => {
    localStorage.removeItem(PENDING_NOTICE_KEY);
    setNotice(null);
    // Recarrega o snapshot principal para que o saldo atualizado seja refletido imediatamente
    // em todas as áreas do jogo sem risco de o estado antigo sobrescrever a penalidade.
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center overflow-y-auto bg-[#030304]/97 p-3 backdrop-blur-lg sm:p-6">
      <div className="my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#EF4444]/55 bg-[#120D0E] shadow-2xl shadow-black/60">
        <header className="border-b border-[#4A2024] bg-[#1B1012] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#EF4444]/45 bg-[#EF4444]/10 text-[#F87171]">
              <ShieldAlert size={25} />
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#F87171]">
                Aviso obrigatório de conduta
              </span>
              <h2 className="mt-1 font-serif text-xl font-black text-[#FFF1F2] sm:text-2xl">
                Atenção: ação antiética registrada
              </h2>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <section className="rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/[0.07] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#F87171]" />
              <div>
                <h3 className="text-sm font-black text-[#FFE4E6]">O Rota da Justiça não incentiva esta conduta.</h3>
                <p className="mt-2 text-xs leading-6 text-[#D8B4B8]">
                  A escolha <strong>“{notice.choiceLabel}”</strong>, no evento <strong>“{notice.eventTitle}”</strong>, foi classificada pelo jogo como antiética ou incompatível com os deveres profissionais do advogado. Dependendo do fato, ela também pode representar ilícito dentro do universo fictício do jogo.
                </p>
                <p className="mt-2 text-xs leading-6 text-[#BFA0A4]">
                  A existência dessa opção serve para simular consequências e dilemas de carreira. Ela não representa recomendação, orientação ou incentivo à prática de qualquer irregularidade na vida real.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Scale size={17} className="text-[#FCA5A5]" />
              <h3 className="font-serif text-base font-black text-[#F4E4E6]">Consequências aplicadas</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#EF4444]/30 bg-[#180F11] p-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#A66A72]">Ética profissional</span>
                <strong className="mt-1 block font-mono text-xl font-black text-[#FCA5A5]">-{notice.ethicsLoss} ponto(s)</strong>
              </div>
              <div className="rounded-xl border border-[#EF4444]/30 bg-[#180F11] p-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#A66A72]">Índole</span>
                <strong className="mt-1 block font-mono text-xl font-black text-[#FCA5A5]">-{notice.characterLoss} ponto(s)</strong>
              </div>
              <div className="rounded-xl border border-[#EF4444]/30 bg-[#180F11] p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <Banknote size={21} className="mt-0.5 shrink-0 text-[#FCA5A5]" />
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#A66A72]">Penalidade financeira da conduta</span>
                    <strong className="mt-1 block font-mono text-xl font-black text-[#FCA5A5]">-{formatMoney(notice.financialPenalty)}</strong>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#9E7B80]">
                      {notice.actualMoneyDeducted < notice.financialPenalty
                        ? `Seu saldo não pode ficar negativo. Foram debitados ${formatMoney(notice.actualMoneyDeducted)} e o saldo ficou em ${formatMoney(notice.remainingMoney)}.`
                        : `Novo saldo disponível: ${formatMoney(notice.remainingMoney)}.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/[0.05] p-4 text-[10px] leading-5 text-[#C8AE79]">
            <strong className="block text-[#FCD34D]">Consequências futuras continuam possíveis.</strong>
            O risco de exposição permanece oculto. Uma conduta desta natureza pode voltar a aparecer em investigação do Ministério Público, procedimento disciplinar da OAB, perda de reputação, suspensão, cassação da inscrição ou outras consequências previstas pela campanha.
            {notice.hasDisciplinaryIncident && ' Esta decisão também gerou registro no histórico disciplinar oculto do personagem.'}
          </section>

          <button
            type="button"
            onClick={acknowledge}
            className="w-full rounded-xl bg-[#DC2626] px-5 py-3.5 text-xs font-black uppercase tracking-[0.09em] text-white transition-transform hover:scale-[1.01]"
          >
            Reconheço as consequências e continuar
          </button>

          <p className="text-center text-[9px] leading-relaxed text-[#765D61]">
            Este aviso é obrigatório e não pode ser fechado sem reconhecimento. Se o jogo for encerrado agora, ele será exibido novamente na próxima abertura.
          </p>
        </div>
      </div>
    </div>
  );
};

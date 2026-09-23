import React from 'react';
import {
  Bath,
  BedDouble,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  Home,
  Lightbulb,
  ShoppingBasket,
  Utensils,
  WalletCards,
  Wifi,
  X,
} from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import {
  currentHouseholdBillKey,
  getBestBedBonuses,
  getBestStudyBonus,
  getHouseholdBillSummary,
  getHouseholdMonthlyBills,
  isHouseholdBillPaid,
  lifeNeedLabel,
} from '../../lib/lifeSimulation';

interface PlayerHomeModalProps {
  player: PlayerProfile;
  isOpen: boolean;
  warningMessage?: string;
  onClose: () => void;
  onSleep: () => void;
  onShower: () => void;
  onEat: () => void;
  onStudy: () => void;
  onPayBills: () => void;
  onOpenCityMap: () => void;
}

function meterClass(value: number, dangerWhenHigh = false) {
  const dangerValue = dangerWhenHigh ? 100 - value : value;
  if (dangerValue <= 20) return 'bg-[#F87171]';
  if (dangerValue <= 45) return 'bg-[#FBBF24]';
  return 'bg-[#34D399]';
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function NeedCard({
  label,
  value,
  icon,
  dangerWhenHigh = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  dangerWhenHigh?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#2A2E34] bg-[#111419] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#C7CBD0]">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </div>
        <strong className="font-mono text-sm text-[#F2F0EC]">{Math.round(value)}%</strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#252A30]">
        <div className={`h-full transition-all ${meterClass(value, dangerWhenHigh)}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <small className="mt-2 block text-[9px] font-bold uppercase tracking-wider text-[#777D86]">{dangerWhenHigh ? (value >= 80 ? 'Crítico' : value >= 55 ? 'Alto' : value >= 30 ? 'Atenção' : 'Baixo') : lifeNeedLabel(value)}</small>
    </article>
  );
}

export const PlayerHomeModal: React.FC<PlayerHomeModalProps> = ({
  player,
  isOpen,
  warningMessage = '',
  onClose,
  onSleep,
  onShower,
  onEat,
  onStudy,
  onPayBills,
  onOpenCityMap,
}) => {
  if (!isOpen) return null;

  const household = player.household;
  const residence = household.residence;
  const bills = getHouseholdMonthlyBills(household);
  const billSummary = getHouseholdBillSummary(player);
  const billsPaid = isHouseholdBillPaid(player);
  const bed = getBestBedBonuses(household);
  const studyBonus = getBestStudyBonus(household);
  const isIntern = player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR';
  const mealLabel = player.gameCurrentMinutes >= 11 * 60 && player.gameCurrentMinutes < 16 * 60
    ? 'Almoçar'
    : player.gameCurrentMinutes >= 18 * 60 && player.gameCurrentMinutes < 23 * 60
      ? 'Jantar'
      : player.gameCurrentMinutes >= 5 * 60 && player.gameCurrentMinutes < 11 * 60
        ? 'Café da manhã'
        : 'Fazer uma refeição';

  return (
    <div className="fixed inset-0 z-[175] overflow-y-auto bg-black/90 p-3 backdrop-blur-md sm:p-6">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-[#30343A] bg-[#0C0F12] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#282D33] bg-[#111419] px-5 py-5 sm:px-7">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#D9BA71]">
              <Home size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#A58A56]">Vida pessoal</span>
              <h2 className="mt-1 font-serif text-2xl font-black text-[#F2EFE8]">Casa de {player.name || 'personagem'}</h2>
              <p className="mt-1 text-xs leading-5 text-[#8D939C]">
                {residence.street && residence.number
                  ? `${residence.street}, ${residence.number} • ${residence.city}/${residence.state}`
                  : `${residence.city || player.homeCity || 'Cidade-base'}/${residence.state || player.homeState || 'BR'}`}
              </p>
              <small className="mt-1 block text-[9px] text-[#67707A]">
                Endereço privado da carreira • não publicado no mapa público ou no Rota Admin
              </small>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#31363D] text-[#999FA7]">
            <X size={18} />
          </button>
        </header>

        {warningMessage && (
          <div className="mx-5 mt-5 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-xs font-semibold leading-5 text-[#FCA5A5] sm:mx-7">
            {warningMessage}
          </div>
        )}

        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            <section>
              <div className="mb-3">
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7C838C]">Necessidades atuais</span>
                <h3 className="mt-1 text-base font-black text-[#E9E7E2]">Seu corpo acompanha o relógio do jogo</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <NeedCard label="Energia" value={household.needs.energy} icon={<BedDouble size={17} />} />
                <NeedCard label="Fome" value={100 - household.needs.hunger} dangerWhenHigh icon={<Utensils size={17} />} />
                <NeedCard label="Higiene" value={household.needs.hygiene} icon={<Bath size={17} />} />
                <NeedCard label="Estudos" value={household.needs.study} icon={<BookOpenCheck size={17} />} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#2C3137] bg-[#111419] p-4">
              <div className="mb-4">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#7B828B]">Rotina em casa</span>
                <h3 className="mt-1 text-base font-black text-[#E9E7E2]">Ações pessoais</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={onSleep} className="rounded-xl border border-[#485B78] bg-[#17202C] p-4 text-left transition hover:border-[#6E8DB9]">
                  <BedDouble size={18} className="text-[#8EB6E8]" />
                  <strong className="mt-2 block text-sm text-[#E7EDF5]">Dormir 8 horas</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#8B9BAE]">Recupera energia. Cama melhor aumenta a recuperação.</span>
                </button>
                <button type="button" onClick={onShower} className="rounded-xl border border-[#31586A] bg-[#122028] p-4 text-left transition hover:border-[#4D8299]">
                  <Bath size={18} className="text-[#75C3E6]" />
                  <strong className="mt-2 block text-sm text-[#E4F0F5]">Tomar banho • 30 min</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#82A5B4]">Recupera higiene e consome tempo do dia.</span>
                </button>
                <button
                  type="button"
                  onClick={onEat}
                  disabled={household.foodUnits <= 0}
                  className="rounded-xl border border-[#5D5231] bg-[#211D12] p-4 text-left transition hover:border-[#8A7844] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Utensils size={18} className="text-[#E1C36C]" />
                  <strong className="mt-2 block text-sm text-[#F2E9D3]">{mealLabel} • 45 min</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#A99B75]">Consome 1 unidade da despensa. Restam {household.foodUnits}.</span>
                </button>
                <button type="button" onClick={onStudy} className="rounded-xl border border-[#4A3F69] bg-[#191525] p-4 text-left transition hover:border-[#725F9E]">
                  <BookOpenCheck size={18} className="text-[#B69BE9]" />
                  <strong className="mt-2 block text-sm text-[#EEE8F8]">{isIntern ? 'Estudar para a faculdade • 2h' : 'Estudo profissional • 2h'}</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#9588AA]">Mantém a rotina acadêmica/profissional em dia.</span>
                </button>
              </div>
            </section>

            {isIntern && (
              <section className="flex items-start gap-3 rounded-2xl border border-[#60A5FA]/25 bg-[#60A5FA]/8 p-4">
                <GraduationCap size={20} className="mt-0.5 shrink-0 text-[#7FB4F4]" />
                <div>
                  <strong className="text-sm text-[#DCEBFA]">Universidade ativa durante o estágio</strong>
                  <p className="mt-1 text-[10px] leading-4 text-[#8FAEC8]">
                    Enquanto sua carreira estiver em ESTAGIÁRIO ou ESTAGIÁRIO SÊNIOR, a faculdade aparece no mapa da cidade e seus estudos continuam sendo uma necessidade da rotina.
                  </p>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-[#343028] bg-[#17140F] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#8D7A57]">Despensa</span>
                  <strong className="mt-1 block text-xl text-[#F0E5CE]">{household.foodUnits} refeições</strong>
                </div>
                <ShoppingBasket size={24} className="text-[#D8B768]" />
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[#96886E]">
                Compre alimentos em supermercados publicados pelo Rota Admin. Cada produto pode adicionar unidades à despensa.
              </p>
              <button type="button" onClick={onOpenCityMap} className="mt-3 w-full rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/8 px-4 py-2.5 text-xs font-black text-[#D8BD7A]">
                Abrir mapa para fazer compras
              </button>
            </section>

            <section className="rounded-2xl border border-[#2D3238] bg-[#111419] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#777E87]">Contas da casa</span>
                  <strong className="mt-1 block text-sm text-[#ECEAE6]">Competência {currentHouseholdBillKey(player)}</strong>
                  {!billsPaid && billSummary.dueMonths > 1 && (
                    <small className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-[#FBBF24]">
                      {billSummary.dueMonths} competências pendentes
                    </small>
                  )}
                </div>
                {billsPaid ? <CheckCircle2 size={20} className="text-[#34D399]" /> : <WalletCards size={20} className="text-[#FBBF24]" />}
              </div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between"><span className="text-[#8A9098]">Aluguel</span><strong>JR$ {formatMoney(bills.rent)}</strong></div>
                <div className="flex justify-between"><span className="text-[#8A9098]">Água</span><strong>JR$ {formatMoney(bills.water)}</strong></div>
                <div className="flex justify-between"><span className="text-[#8A9098]">Energia</span><strong>JR$ {formatMoney(bills.electricity)}</strong></div>
                <div className="flex justify-between"><span className="text-[#8A9098]">Internet</span><strong>JR$ {formatMoney(bills.internet)}</strong></div>
                <div className="flex justify-between"><span className="text-[#8A9098]">Gás</span><strong>JR$ {formatMoney(bills.gas)}</strong></div>
                <div className="mt-2 flex justify-between border-t border-[#2A2E33] pt-2"><span className="font-black text-[#B8BDC4]">Mensal</span><strong className="text-[#F1EEE9]">JR$ {formatMoney(bills.total)}</strong></div>
                {!billsPaid && (
                  <div className="mt-2 flex justify-between rounded-lg border border-[#FBBF24]/20 bg-[#FBBF24]/8 px-2.5 py-2">
                    <span className="font-black text-[#D7B86E]">Total pendente</span>
                    <strong className="text-[#F4D887]">JR$ {formatMoney(billSummary.totalDue)}</strong>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onPayBills}
                disabled={billsPaid || player.money < billSummary.totalDue}
                className="mt-4 w-full rounded-xl bg-[#9A783D] px-4 py-3 text-xs font-black text-[#11100D] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {billsPaid
                  ? 'Contas pagas neste mês'
                  : player.money < billSummary.totalDue
                    ? 'Saldo insuficiente'
                    : billSummary.dueMonths > 1
                      ? `Pagar ${billSummary.dueMonths} competências`
                      : 'Pagar contas da casa'}
              </button>
            </section>

            <section className="rounded-2xl border border-[#2D3238] bg-[#111419] p-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#777E87]">Conforto & patrimônio doméstico</span>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-xl border border-[#292D32] bg-[#0D1014] p-3">
                  <BedDouble size={15} className="text-[#8EB6E8]" />
                  <span className="mt-2 block text-[#777E87]">Cama</span>
                  <strong className="mt-1 block text-[#E7EDF5]">+{Math.round(bed.energyBonus)} energia</strong>
                </div>
                <div className="rounded-xl border border-[#292D32] bg-[#0D1014] p-3">
                  <BookOpenCheck size={15} className="text-[#B69BE9]" />
                  <span className="mt-2 block text-[#777E87]">Área de estudo</span>
                  <strong className="mt-1 block text-[#EEE8F8]">+{Math.round(studyBonus)} estudo</strong>
                </div>
                <div className="rounded-xl border border-[#292D32] bg-[#0D1014] p-3">
                  <Lightbulb size={15} className="text-[#FBBF24]" />
                  <span className="mt-2 block text-[#777E87]">Móveis</span>
                  <strong className="mt-1 block text-[#EEE9DF]">{household.furniture.length}</strong>
                </div>
                <div className="rounded-xl border border-[#292D32] bg-[#0D1014] p-3">
                  <Wifi size={15} className="text-[#60A5FA]" />
                  <span className="mt-2 block text-[#777E87]">Veículos</span>
                  <strong className="mt-1 block text-[#E6EDF7]">{household.vehicles.length}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
};

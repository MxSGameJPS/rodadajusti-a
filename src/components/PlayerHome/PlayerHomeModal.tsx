import React from 'react';
import {
  Bath,
  BedDouble,
  BookOpenCheck,
  CheckCircle2,
  Droplets,
  Flame,
  GraduationCap,
  Home,
  LogOut,
  Map,
  BriefcaseBusiness,
  Lightbulb,
  PackageOpen,
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
  getHouseholdEquipmentBonuses,
  getHouseholdMonthlyBills,
  getHouseholdServiceStatus,
  getPantryCapacity,
  getSleepPlan,
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
  onEat: (pantryItemId: string) => void;
  onStudy: () => void;
  onGoToUniversity: () => void;
  onGoToOffice: () => void;
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
  onGoToUniversity,
  onGoToOffice,
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
  const equipment = getHouseholdEquipmentBonuses(household);
  const pantryCapacity = getPantryCapacity(household);
  const services = getHouseholdServiceStatus(player);
  const sleepPlan = getSleepPlan(player);
  const isIntern = player.careerTier === 'ESTAGIARIO' || player.careerTier === 'ESTAGIARIO_SENIOR';
  const [selectedPantryItemId, setSelectedPantryItemId] = React.useState<string>('');
  const selectedPantryItem = household.pantry.find((item) => item.id === selectedPantryItemId)
    || household.pantry.find((item) => item.quantity > 0)
    || null;

  React.useEffect(() => {
    if (!isOpen) return;
    const currentExists = household.pantry.some(
      (item) => item.id === selectedPantryItemId && item.quantity > 0,
    );
    if (!currentExists) {
      setSelectedPantryItemId(
        household.pantry.find((item) => item.quantity > 0)?.id || '',
      );
    }
  }, [isOpen, household.pantry, selectedPantryItemId]);
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
          <button
            type="button"
            onClick={onClose}
            title="Sair de casa e abrir o mapa da cidade"
            aria-label="Sair de casa"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#31363D] text-[#999FA7] transition hover:border-[#C5A059]/40 hover:text-[#D8BD7A]"
          >
            <LogOut size={18} />
          </button>
        </header>

        {warningMessage && (
          <div className="mx-5 mt-5 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-xs font-semibold leading-5 text-[#FCA5A5] sm:mx-7">
            {warningMessage}
          </div>
        )}

        <div className="border-b border-[#282D33] bg-[#0F1216] px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7C838C]">Sair de casa</span>
              <p className="mt-1 text-[10px] leading-4 text-[#777E87]">
                Escolha para onde o personagem vai. O deslocamento consome tempo e aparece no mapa.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:shrink-0">
              <button
                type="button"
                onClick={onOpenCityMap}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3A414A] bg-[#14191E] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#B4BBC4] transition hover:border-[#5E6874]"
              >
                <Map size={15} />
                Mapa da cidade
              </button>

              <button
                type="button"
                onClick={onGoToOffice}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#DFC77F] transition hover:bg-[#C5A059]/15"
              >
                <BriefcaseBusiness size={15} />
                Ir ao escritório
              </button>

              {isIntern && (
                <button
                  type="button"
                  onClick={onGoToUniversity}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#AED0FA] transition hover:bg-[#60A5FA]/15 sm:col-span-2 lg:col-span-1"
                >
                  <GraduationCap size={15} />
                  Ir à faculdade
                </button>
              )}
            </div>
          </div>
        </div>

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
                <button
                  type="button"
                  onClick={onSleep}
                  disabled={sleepPlan.kind === 'BLOCKED'}
                  className="rounded-xl border border-[#485B78] bg-[#17202C] p-4 text-left transition hover:border-[#6E8DB9] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <BedDouble size={18} className="text-[#8EB6E8]" />
                  <strong className="mt-2 block text-sm text-[#E7EDF5]">{sleepPlan.label}</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#8B9BAE]">{sleepPlan.detail}</span>
                </button>
                <button
                  type="button"
                  onClick={onShower}
                  disabled={!services.water}
                  className="rounded-xl border border-[#31586A] bg-[#122028] p-4 text-left transition hover:border-[#4D8299] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Bath size={18} className="text-[#75C3E6]" />
                  <strong className="mt-2 block text-sm text-[#E4F0F5]">Tomar banho • 30 min</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#82A5B4]">
                    {services.water
                      ? 'Recupera higiene' + (equipment.hygieneBonus > 0 ? ' • bônus do banheiro +' + Math.round(equipment.hygieneBonus) : '') + '.'
                      : 'Água suspensa por contas atrasadas.'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPantryItem) onEat(selectedPantryItem.id);
                  }}
                  disabled={
                    !selectedPantryItem
                    || (selectedPantryItem.requiresCooking && !services.gas)
                  }
                  className="rounded-xl border border-[#5D5231] bg-[#211D12] p-4 text-left transition hover:border-[#8A7844] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Utensils size={18} className="text-[#E1C36C]" />
                  <strong className="mt-2 block text-sm text-[#F2E9D3]">{mealLabel} • 45 min</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#A99B75]">
                    {!selectedPantryItem
                      ? 'Despensa vazia.'
                      : selectedPantryItem.requiresCooking && !services.gas
                        ? 'Este alimento precisa de preparo, mas o gás está suspenso.'
                        : selectedPantryItem.title + ' • +' + Math.round(selectedPantryItem.hungerRestore + equipment.mealBonus) + ' saciedade.'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onStudy}
                  disabled={!services.electricity || !services.internet}
                  className="rounded-xl border border-[#4A3F69] bg-[#191525] p-4 text-left transition hover:border-[#725F9E] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <BookOpenCheck size={18} className="text-[#B69BE9]" />
                  <strong className="mt-2 block text-sm text-[#EEE8F8]">{isIntern ? 'Estudar para a faculdade • 2h' : 'Estudo profissional • 2h'}</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#9588AA]">
                    {!services.electricity || !services.internet
                      ? 'Energia e internet precisam estar ativas para estudar em casa.'
                      : 'Mantém a rotina em dia' + (studyBonus > 0 ? ' • bônus do ambiente +' + Math.round(studyBonus) : '') + '.'}
                  </span>
                </button>
              </div>
            </section>

            {isIntern && (
              <section className="flex items-start gap-3 rounded-2xl border border-[#60A5FA]/25 bg-[#60A5FA]/8 p-4">
                <GraduationCap size={20} className="mt-0.5 shrink-0 text-[#7FB4F4]" />
                <div className="min-w-0 flex-1">
                  <strong className="text-sm text-[#DCEBFA]">Universidade ativa durante o estágio</strong>
                  <p className="mt-1 text-[10px] leading-4 text-[#8FAEC8]">
                    Vá até a faculdade pelo mapa, cumpra 3 horas de estudo e retorne automaticamente para casa ao final da rotina acadêmica.
                  </p>
                  <button
                    type="button"
                    onClick={onGoToUniversity}
                    className="mt-3 rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/12 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#AED0FA]"
                  >
                    Ir para a faculdade
                  </button>
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

              {(household.furniture.length > 0 || household.vehicles.length > 0) && (
                <div className="mt-4 border-t border-[#292D32] pt-4">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#777E87]">Bens adquiridos</span>
                  <div className="mt-3 grid gap-2">
                    {household.furniture.slice(-6).reverse().map((item) => (
                      <article key={item.id} className="flex items-center gap-3 rounded-xl border border-[#292D32] bg-[#0D1014] p-2.5">
                        <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-[#30353B] bg-[#15191E]">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-[#777E87]"><BedDouble size={17} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[10px] text-[#E8E6E1]">{item.title}</strong>
                          <span className="mt-1 block text-[8px] uppercase tracking-wider text-[#747B84]">
                            {item.kind}
                            {item.energyBonus > 0 ? ` • +${item.energyBonus} energia` : ''}
                            {item.comfortBonus > 0 ? ` • +${item.comfortBonus} conforto` : ''}
                            {item.studyBonus > 0 ? ` • +${item.studyBonus} estudo` : ''}
                          </span>
                        </div>
                      </article>
                    ))}
                    {household.vehicles.slice(-4).reverse().map((item) => (
                      <article key={item.id} className="flex items-center gap-3 rounded-xl border border-[#292D32] bg-[#0D1014] p-2.5">
                        <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-[#30353B] bg-[#15191E]">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-[#777E87]"><WalletCards size={17} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[10px] text-[#E8E6E1]">{item.title}</strong>
                          <span className="mt-1 block text-[8px] uppercase tracking-wider text-[#747B84]">Veículo próprio</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
};

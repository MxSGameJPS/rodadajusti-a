import React, { useState } from 'react';
import { PlayerProfile, OfficeEmployee } from '../types/game';
import { 
  X, 
  Building, 
  Users, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  UserPlus, 
  DollarSign,
  Briefcase,
  Lightbulb,
  Wifi,
  Droplets,
  AlertCircle
} from 'lucide-react';
import { sound } from '../utils/sound';
import { usePlayerDisplayName } from '../lib/playerTreatment';

interface OfficeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onHireEmployee: (employee: OfficeEmployee) => void;
  onFireEmployee: (employeeId: string) => void;
  onPayOfficeExpenses: () => void;
}

export const OfficeManagementModal: React.FC<OfficeManagementModalProps> = ({
  isOpen,
  onClose,
  player,
  onHireEmployee,
  onFireEmployee,
  onPayOfficeExpenses,
}) => {
  const [activeTab, setActiveTab] = useState<'financeiro' | 'equipe'>('financeiro');
  const displayName = usePlayerDisplayName(player);

  if (!isOpen) return null;

  const finances = player.officeFinances;
  const totalSalaries = finances.employees.reduce((acc, emp) => acc + emp.salaryMonthly, 0);
  const totalFixedCosts = finances.rentMonthly + finances.utilitiesMonthly + finances.adminExpensesMonthly + totalSalaries;

  const availableHires: OfficeEmployee[] = [
    {
      id: 'hire_estagiario_1',
      name: 'João Pedro Ramos',
      role: 'Estagiário',
      salaryMonthly: 1500,
      productivityBonus: 10,
      avatarBg: 'bg-[#1A1A1D]'
    },
    {
      id: 'hire_adv_junior',
      name: 'Dra. Mariana Costa',
      role: 'Advogado Júnior',
      salaryMonthly: 4800,
      productivityBonus: 25,
      avatarBg: 'bg-[#1A1A1D]'
    },
    {
      id: 'hire_secretaria',
      name: 'Luciana Alves',
      role: 'Secretária Executiva',
      salaryMonthly: 2800,
      productivityBonus: 15,
      avatarBg: 'bg-[#1A1A1D]'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden text-[#E0E0E0] my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111113] px-6 py-4 border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
              <Building size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-[#E0E0E0] flex items-center gap-2">
                Gestão & Administração do Escritório Próprio
              </h2>
              <p className="text-xs text-[#888888]">
                Titular: <strong className="text-[#C5A059]">{displayName}</strong> • Sociedade Individual de Advocacia
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-[#1A1A1D] hover:bg-[#222226] text-[#888888] hover:text-[#E0E0E0] border border-[#2A2A2E] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Financial KPI Strip */}
        <div className="p-4 bg-[#0D0D0E] border-b border-[#222226] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Caixa do Escritório</span>
            <span className="font-bold text-[#34D399] text-sm font-mono">
              R$ {player.money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Custo Fixo Mensal</span>
            <span className="font-bold text-[#F87171] text-sm font-mono">
              R$ {totalFixedCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Equipe Ativa</span>
            <span className="font-bold text-[#E0E0E0] text-sm font-mono">
              {finances.employees.length} Colaboradores
            </span>
          </div>

          <div className="p-2.5 bg-[#161618] rounded-xl border border-[#2A2A2E]">
            <span className="text-[10px] text-[#888888] uppercase tracking-wider block font-mono">Status do Caixa</span>
            <span className={`font-bold text-xs font-mono ${player.money >= totalFixedCosts ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
              {player.money >= totalFixedCosts ? 'Equilibrado' : 'Atenção: Saldo Baixo'}
            </span>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4 bg-[#111113] border-b border-[#2A2A2E] flex items-center gap-4 text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('financeiro');
            }}
            className={`pb-3 font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              activeTab === 'financeiro'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            <DollarSign size={14} />
            <span>Despesas & Fluxo de Caixa</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('equipe');
            }}
            className={`pb-3 font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              activeTab === 'equipe'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            <Users size={14} />
            <span>Contratação & Equipe ({finances.employees.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-[#0A0A0B]">
          {activeTab === 'financeiro' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">
                Detalhamento dos Custos Operacionais Mensais:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={16} className="text-[#C5A059]" />
                    <span className="text-[#E0E0E0]">Aluguel da Sala Comercial</span>
                  </div>
                  <span className="font-mono font-bold text-[#E0E0E0]">
                    R$ {finances.rentMonthly.toLocaleString('pt-BR')}/mês
                  </span>
                </div>

                <div className="p-3.5 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets size={16} className="text-[#60A5FA]" />
                    <span className="text-[#E0E0E0]">Água e Saneamento</span>
                  </div>
                  <span className="font-mono font-bold text-[#E0E0E0]">R$ 180,00/mês</span>
                </div>

                <div className="p-3.5 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-[#C5A059]" />
                    <span className="text-[#E0E0E0]">Energia Elétrica & Climatização</span>
                  </div>
                  <span className="font-mono font-bold text-[#E0E0E0]">R$ 420,00/mês</span>
                </div>

                <div className="p-3.5 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi size={16} className="text-[#C5A059]" />
                    <span className="text-[#E0E0E0]">Internet Fibra & PJe Link Dedicado</span>
                  </div>
                  <span className="font-mono font-bold text-[#E0E0E0]">R$ 290,00/mês</span>
                </div>
              </div>

              {/* Monthly settlement button */}
              <div className="p-4 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#E0E0E0]">Liquidação de Despesas do Mês Atual</h4>
                  <p className="text-[11px] text-[#888888]">Paga o aluguel, concessionárias e salários da equipe.</p>
                </div>
                <button
                  onClick={() => {
                    sound.playStamp();
                    onPayOfficeExpenses();
                  }}
                  disabled={player.money < totalFixedCosts}
                  className="px-4 py-2 bg-[#C5A059] hover:bg-[#D4B475] disabled:opacity-50 text-[#0A0A0B] font-bold text-xs rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Pagar Despesas Fixas (R$ {totalFixedCosts.toLocaleString('pt-BR')})
                </button>
              </div>
            </div>
          )}

          {activeTab === 'equipe' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">
                Colaboradores Ativos no Escritório:
              </h3>

              {finances.employees.length === 0 ? (
                <div className="p-6 text-center text-[#666666] text-xs border border-dashed border-[#2A2A2E] rounded-xl">
                  Nenhum colaborador contratado ainda. Contrate estagiários ou advogados juniores para acelerar diligências.
                </div>
              ) : (
                <div className="space-y-2">
                  {finances.employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3.5 bg-[#161618] rounded-xl border border-[#2A2A2E] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1A1A1D] border border-[#2A2A2E] flex items-center justify-center font-bold text-[#C5A059]">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#E0E0E0]">{emp.name}</h4>
                          <span className="text-[10px] text-[#888888]">{emp.role} • Bônus: +{emp.productivityBonus}% pesquisa</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[#34D399] font-semibold">
                          R$ {emp.salaryMonthly.toLocaleString('pt-BR')}/mês
                        </span>
                        <button
                          onClick={() => {
                            sound.playClick();
                            onFireEmployee(emp.id);
                          }}
                          className="text-[11px] text-[#F87171] hover:text-[#FCA5A5] underline cursor-pointer"
                        >
                          Demitir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888] pt-3">
                Candidatos Disponíveis para Contratação:
              </h3>

              <div className="space-y-2">
                {availableHires
                  .filter((hire) => !finances.employees.some((e) => e.name === hire.name))
                  .map((candidate) => (
                    <div
                      key={candidate.id}
                      className="p-3.5 bg-[#161618] hover:bg-[#1A1A1D] rounded-xl border border-[#2A2A2E] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1A1A1D] border border-[#2A2A2E] flex items-center justify-center font-bold text-[#C5A059]">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#E0E0E0]">{candidate.name}</h4>
                          <span className="text-[10px] text-[#888888]">{candidate.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[#CCCCCC]">
                          Salário: R$ {candidate.salaryMonthly.toLocaleString('pt-BR')}/mês
                        </span>
                        <button
                          onClick={() => {
                            sound.playVictory();
                            onHireEmployee(candidate);
                          }}
                          className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#D4B475] text-[#0A0A0B] font-bold text-xs rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          Contratar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111113] border-t border-[#2A2A2E] flex items-center justify-between text-xs">
          <span className="text-[#888888]">
            A boa administração do caixa garante a sustentabilidade e a expansão do escritório.
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#1A1A1D] hover:bg-[#222226] text-[#E0E0E0] border border-[#2A2A2E] font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

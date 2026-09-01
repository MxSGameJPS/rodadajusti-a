import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Gavel,
  GraduationCap,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register';

type AuthGateProps = {
  children: ReactNode;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getReadableAuthError(message?: string) {
  const normalized = (message || '').toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  if (normalized.includes('user already registered')) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (normalized.includes('password should be at least')) {
    return 'Sua senha precisa ter pelo menos 6 caracteres.';
  }
  if (normalized.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
  }

  return message || 'Não foi possível concluir a operação agora.';
}

function AuthLoadingScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07090D] px-6 text-[#F3F1EA]">
      <div className="absolute left-[-140px] top-[-140px] h-[420px] w-[420px] rounded-full bg-[#C5A059]/10 blur-[120px]" />
      <div className="absolute bottom-[-180px] right-[-140px] h-[460px] w-[460px] rounded-full bg-[#315D78]/15 blur-[130px]" />
      <div className="relative flex flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#111319] text-[#D6B66A] shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
          <Scale size={29} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#A88B50]">Rota da Justiça</span>
        <h1 className="mt-3 font-serif text-2xl font-semibold">Preparando sua jornada</h1>
        <div className="mt-6 h-1 w-28 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#C5A059]" />
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  function resetFeedback() {
    setError('');
    setSuccessMessage('');
  }

  function switchMode(nextMode: AuthMode) {
    resetFeedback();
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();

    if (!supabase) {
      setError('O Supabase ainda não está configurado neste ambiente.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setError('Sua senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (mode === 'register') {
      if (name.trim().length < 2) {
        setError('Informe seu nome para criar a conta.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas informadas não são iguais.');
        return;
      }
      if (!acceptedTerms) {
        setError('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) throw signInError;
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            source: 'rota-da-justica-web',
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) throw signUpError;

      if (!data.session) {
        setSuccessMessage('Conta criada. Confira seu e-mail para confirmar o cadastro e liberar o acesso.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : undefined;
      setError(getReadableAuthError(message));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSocialJuridicoLogin() {
    resetFeedback();

    if (!supabase) {
      setError('O Supabase ainda não está configurado neste ambiente.');
      return;
    }

    setOauthSubmitting(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'custom:social-juridico',
        options: {
          redirectTo: window.location.origin,
          scopes: 'openid email profile',
        },
      });

      if (oauthError) throw oauthError;
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : undefined;
      setError(getReadableAuthError(message));
      setOauthSubmitting(false);
    }
  }

  async function handlePasswordRecovery() {
    resetFeedback();

    if (!supabase) {
      setError('O Supabase ainda não está configurado neste ambiente.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Digite seu e-mail primeiro para recuperar a senha.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      });

      if (recoveryError) throw recoveryError;
      setSuccessMessage('Enviamos as instruções de recuperação para o seu e-mail.');
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : undefined;
      setError(getReadableAuthError(message));
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07090D] text-[#F4F2EC] selection:bg-[#C5A059]/35 selection:text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-180px] top-[-190px] h-[520px] w-[520px] rounded-full bg-[#C5A059]/10 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-[-160px] h-[520px] w-[520px] rounded-full bg-[#2A5D7A]/16 blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/[0.06] px-10 py-10 lg:flex xl:px-16 xl:py-14">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#111319]/90 text-[#D4B468] shadow-[0_16px_50px_rgba(0,0,0,.35)]">
                <Scale size={24} />
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-[0.3em] text-[#8D7443]">Uma experiência</span>
                <strong className="mt-1 block text-sm font-semibold tracking-wide text-[#ECE8DE]">Social Jurídico</strong>
              </div>
            </div>
          </div>

          <div className="max-w-2xl py-14">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C5A059]/20 bg-[#C5A059]/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C7A75B]">
              <Sparkles size={13} />
              Simulador de carreira jurídica
            </div>

            <h1 className="max-w-xl font-serif text-5xl font-semibold leading-[1.03] tracking-[-0.035em] text-white xl:text-6xl">
              Toda carreira começa com uma primeira decisão.
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#949AA6] xl:text-base">
              Investigue casos, construa sua reputação, avance na carreira e descubra os caminhos possíveis dentro do universo jurídico.
            </p>

            <div className="mt-10 grid max-w-xl gap-3">
              <div className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C5A059]/10 text-[#D1B36A]">
                  <Gavel size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#F0EDE5]">Casos, provas e decisões</h2>
                  <p className="mt-1 text-xs leading-5 text-[#777F8C]">Cada escolha muda a forma como sua trajetória profissional evolui.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4E78A4]/10 text-[#79A5D2]">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#F0EDE5]">Carreira e formação</h2>
                  <p className="mt-1 text-xs leading-5 text-[#777F8C]">Do estágio à advocacia, sociedade, magistratura e grandes objetivos.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4C8A71]/10 text-[#77BE9C]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#F0EDE5]">Sua jornada, sua conta</h2>
                  <p className="mt-1 text-xs leading-5 text-[#777F8C]">Entre com o Rota da Justiça ou use sua conta Social Jurídico.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="max-w-lg text-[10px] leading-5 text-[#555D69]">
            Rota da Justiça é uma experiência de simulação. Casos, personagens e decisões do jogo possuem finalidade de entretenimento e aprendizado.
          </p>
        </section>

        <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-10 xl:px-14">
          <div className="w-full max-w-[500px]">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#111319] text-[#D4B468]">
                  <Scale size={21} />
                </div>
                <div>
                  <span className="block font-serif text-lg font-semibold">Rota da Justiça</span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8D7443]">Uma experiência Social Jurídico</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0D1016]/95 shadow-[0_34px_100px_rgba(0,0,0,.5)] backdrop-blur-xl sm:rounded-[32px]">
              <div className="border-b border-white/[0.06] px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9C8149]">
                  {mode === 'login' ? 'Bem-vindo de volta' : 'Comece sua trajetória'}
                </span>
                <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.025em] text-white sm:text-[34px]">
                  {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
                </h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#7F8793]">
                  {mode === 'login'
                    ? 'Continue de onde parou e retome sua carreira jurídica.'
                    : 'Seu progresso começa aqui. O cadastro leva menos de um minuto.'}
                </p>
              </div>

              <div className="px-5 py-5 sm:px-8 sm:py-7">
                {!isSupabaseConfigured && (
                  <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs leading-5 text-amber-100/80">
                    Configure <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong> para ativar o login neste ambiente.
                  </div>
                )}

                {error && (
                  <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-200" role="alert">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-xs leading-5 text-emerald-100/80" role="status">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={16} />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSocialJuridicoLogin}
                  disabled={oauthSubmitting || submitting || !isSupabaseConfigured}
                  className="group flex min-h-12 w-full items-center justify-between rounded-2xl border border-[#C5A059]/25 bg-[#C5A059]/[0.055] px-4 text-sm font-semibold text-[#E9E2D1] transition-all hover:border-[#C5A059]/55 hover:bg-[#C5A059]/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#C5A059] text-[#090B0F]">
                      <Scale size={17} />
                    </span>
                    {oauthSubmitting ? 'Conectando ao Social Jurídico...' : 'Continuar com Social Jurídico'}
                  </span>
                  <ArrowRight size={16} className="text-[#9A814D] transition-transform group-hover:translate-x-0.5" />
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#505864]">ou use seu e-mail</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {mode === 'register' && (
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-[#A5ABB4]">Nome</span>
                      <div className="group flex min-h-12 items-center rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 transition-colors focus-within:border-[#C5A059]/45 focus-within:bg-[#C5A059]/[0.025]">
                        <UserRound size={17} className="mr-3 shrink-0 text-[#59616D] group-focus-within:text-[#B99A55]" />
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          type="text"
                          autoComplete="name"
                          placeholder="Como devemos chamar você?"
                          maxLength={80}
                          className="h-full w-full bg-transparent py-3 text-sm text-[#F4F2EC] outline-none placeholder:text-[#434A54]"
                        />
                      </div>
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-[#A5ABB4]">E-mail</span>
                    <div className="group flex min-h-12 items-center rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 transition-colors focus-within:border-[#C5A059]/45 focus-within:bg-[#C5A059]/[0.025]">
                      <Mail size={17} className="mr-3 shrink-0 text-[#59616D] group-focus-within:text-[#B99A55]" />
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="voce@email.com"
                        maxLength={160}
                        className="h-full w-full bg-transparent py-3 text-sm text-[#F4F2EC] outline-none placeholder:text-[#434A54]"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-[#A5ABB4]">Senha</span>
                    <div className="group flex min-h-12 items-center rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 transition-colors focus-within:border-[#C5A059]/45 focus-within:bg-[#C5A059]/[0.025]">
                      <LockKeyhole size={17} className="mr-3 shrink-0 text-[#59616D] group-focus-within:text-[#B99A55]" />
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder="••••••••"
                        className="h-full min-w-0 flex-1 bg-transparent py-3 text-sm text-[#F4F2EC] outline-none placeholder:text-[#434A54]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="ml-2 rounded-lg p-1.5 text-[#59616D] transition-colors hover:bg-white/5 hover:text-[#D8D8D8]"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {mode === 'register' && password.length > 0 && (
                      <div className="mt-2 flex gap-1.5" aria-label="Força da senha">
                        {[1, 2, 3, 4].map((level) => (
                          <span
                            key={level}
                            className={`h-1 flex-1 rounded-full ${level <= passwordStrength ? 'bg-[#C5A059]' : 'bg-white/[0.06]'}`}
                          />
                        ))}
                      </div>
                    )}
                  </label>

                  {mode === 'register' && (
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-[#A5ABB4]">Confirmar senha</span>
                      <div className="group flex min-h-12 items-center rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 transition-colors focus-within:border-[#C5A059]/45 focus-within:bg-[#C5A059]/[0.025]">
                        <LockKeyhole size={17} className="mr-3 shrink-0 text-[#59616D] group-focus-within:text-[#B99A55]" />
                        <input
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Repita sua senha"
                          className="h-full w-full bg-transparent py-3 text-sm text-[#F4F2EC] outline-none placeholder:text-[#434A54]"
                        />
                      </div>
                    </label>
                  )}

                  {mode === 'login' ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handlePasswordRecovery}
                        disabled={submitting}
                        className="text-[11px] font-semibold text-[#A68B4F] transition-colors hover:text-[#D2B56C]"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-start gap-3 text-[11px] leading-5 text-[#737B86]">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(event) => setAcceptedTerms(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 accent-[#C5A059]"
                      />
                      <span>
                        Concordo com os <span className="font-semibold text-[#A58A50]">Termos de Uso</span> e com a <span className="font-semibold text-[#A58A50]">Política de Privacidade</span> do Rota da Justiça.
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || oauthSubmitting || !isSupabaseConfigured}
                    className="group flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-5 text-sm font-black text-[#0A0B0E] shadow-[0_15px_40px_rgba(197,160,89,.14)] transition-all hover:bg-[#D4B36D] hover:shadow-[0_18px_50px_rgba(197,160,89,.2)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Processando...' : mode === 'login' ? 'Entrar no jogo' : 'Criar minha conta'}
                    {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs text-[#69717D]">
                  {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                    className="font-bold text-[#C1A15A] transition-colors hover:text-[#DEC27A]"
                  >
                    {mode === 'login' ? 'Criar conta' : 'Entrar'}
                  </button>
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] leading-5 text-[#4E5661]">
              <ShieldCheck size={13} />
              <span>Autenticação protegida. Sua senha não é compartilhada entre Rota da Justiça e Social Jurídico.</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Scale } from 'lucide-react';
import styles from './CinematicIntroGate.module.css';

type CinematicIntroGateProps = {
  children: ReactNode;
};

const INTRO_VIDEO_PATH = '/videos/rota-da-justica-intro.mp4';
const ENTER_DELAY_MS = 5000;

function navigate(path: string, replace = false) {
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function CinematicIntroGate({ children }: CinematicIntroGateProps) {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [showEnter, setShowEnter] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const forceIntro = useMemo(
    () => new URLSearchParams(window.location.search).get('intro') === '1',
    [pathname],
  );

  const isIntroRoute = pathname === '/' || forceIntro;

  useEffect(() => {
    const handleRouteChange = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (!isIntroRoute) return;

    setShowEnter(false);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setShowEnter(true);
      return;
    }

    const timer = window.setTimeout(() => setShowEnter(true), ENTER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isIntroRoute]);

  function handleEnter() {
    navigate('/login');
  }

  if (!isIntroRoute) return <>{children}</>;

  return (
    <div className={styles.root}>
      {!videoFailed ? (
        <video
          className={styles.video}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        >
          <source src={INTRO_VIDEO_PATH} type="video/mp4" />
        </video>
      ) : (
        <div className={styles.fallback} aria-hidden="true">
          <div className={styles.fallbackGlowOne} />
          <div className={styles.fallbackGlowTwo} />
          <Scale className={styles.fallbackScale} strokeWidth={1.15} />
        </div>
      )}

      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.brandMark}>
          <Scale size={24} strokeWidth={1.55} />
        </div>

        <div className={styles.kicker}>UMA EXPERIÊNCIA DE CARREIRA JURÍDICA</div>
        <h1>Rota da Justiça</h1>
        <p>Investigue. Decida. Construa sua trajetória.</p>

        <div className={`${styles.enterSlot} ${showEnter ? styles.enterSlotVisible : ''}`}>
          <button
            type="button"
            className={styles.enterButton}
            onClick={handleEnter}
            disabled={!showEnter}
          >
            <span>ENTRAR</span>
            <ArrowRight size={18} />
          </button>
          <span className={styles.enterHint}>Sua carreira começa com uma decisão.</span>
        </div>
      </div>

      <div className={styles.bottomLine}>
        <span>Rota da Justiça</span>
        <span>Simulação • Investigação • Carreira</span>
      </div>
    </div>
  );
}

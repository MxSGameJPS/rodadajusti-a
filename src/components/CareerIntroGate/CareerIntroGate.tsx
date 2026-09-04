import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Briefcase, Scale } from 'lucide-react';
import styles from './CareerIntroGate.module.css';

type CareerIntroGateProps = {
  children: ReactNode;
};

const CAREER_INTRO_VIDEO_PATH = '/videos/inicio-carreira.mp4';
const FADE_DURATION_MS = 900;
const FALLBACK_DURATION_MS = 1600;

function navigateToGame() {
  if (window.location.pathname === '/jogo') return;
  window.history.replaceState({}, '', '/jogo');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function CareerIntroGate({ children }: CareerIntroGateProps) {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [isFading, setIsFading] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  const isCareerIntroRoute = pathname === '/inicio-carreira';

  useEffect(() => {
    const handleRouteChange = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (!isCareerIntroRoute) {
      setIsFading(false);
      setVideoFailed(false);
      return;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setIsFading(true);
      transitionTimerRef.current = window.setTimeout(navigateToGame, FADE_DURATION_MS);
    }

    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [isCareerIntroRoute]);

  function finishIntro() {
    if (isFading) return;
    setIsFading(true);
    transitionTimerRef.current = window.setTimeout(navigateToGame, FADE_DURATION_MS);
  }

  function handleVideoError() {
    setVideoFailed(true);
    fallbackTimerRef.current = window.setTimeout(finishIntro, FALLBACK_DURATION_MS);
  }

  return (
    <>
      {children}

      {isCareerIntroRoute && (
        <div
          className={`${styles.root} ${isFading ? styles.rootFading : ''}`}
          role="presentation"
          aria-label="Cena de início da carreira"
        >
          {!videoFailed ? (
            <video
              className={styles.video}
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={finishIntro}
              onError={handleVideoError}
              aria-hidden="true"
            >
              <source src={CAREER_INTRO_VIDEO_PATH} type="video/mp4" />
            </video>
          ) : (
            <div className={styles.fallback} aria-hidden="true">
              <div className={styles.fallbackGlow} />
              <div className={styles.fallbackCard}>
                <div className={styles.fallbackMark}>
                  <Scale size={30} strokeWidth={1.35} />
                </div>
                <div>
                  <span>Ramos & Associados</span>
                  <strong>Seu primeiro dia começa agora.</strong>
                </div>
                <Briefcase size={22} className={styles.fallbackBriefcase} />
              </div>
            </div>
          )}

          <div className={styles.vignette} aria-hidden="true" />
          <div className={styles.fadeLayer} aria-hidden="true" />
        </div>
      )}
    </>
  );
}

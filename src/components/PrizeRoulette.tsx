import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, RotateCcw, Frown, Sparkles, Check, X, Award, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAudio } from '../context/AudioContext';

// --- CUSTOM SELF-CONTAINED CANVAS CONFETTI EFFECT ---
export const ConfettiEffect: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00E5FF', '#9D50BB', '#FF2E93', '#F5A623', '#10B981', '#EF4444'];
    const particles = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[100] w-full h-full" />;
};

// --- ROULETTE TYPES & UTILS ---
interface PrizeRouletteProps {
  votedArtist: { name: string; imageUrl: string } | null;
  onClose: () => void;
}

interface SectorData {
  id: string;
  label: string;
  logo: string;
  color: string;
  textColor: string;
  type: 'artist' | 'sponsor1' | 'sponsor2' | 'cs_estudio' | 'try_again' | 'not_this_time';
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

const drawWedge = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,
    'Z'
  ].join(' ');
};

export const PrizeRoulette: React.FC<PrizeRouletteProps> = ({ votedArtist, onClose }) => {
  const { isPlaying, togglePlay, volume, setVolume } = useAudio();
  const [countdown, setCountdown] = useState(5);

  // Config states from Firestore
  const [sponsor1Name, setSponsor1Name] = useState('Coca-Cola');
  const [sponsor1Logo, setSponsor1Logo] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&h=150&fit=crop');
  const [sponsor1Prize, setSponsor1Prize] = useState('um copo térmico personalizado');
  const [sponsor2Name, setSponsor2Name] = useState('Heineken');
  const [sponsor2Logo, setSponsor2Logo] = useState('https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&h=150&fit=crop');
  const [sponsor2Prize, setSponsor2Prize] = useState('um lindo boné exclusivo');
  const [csEstudioPrize, setCsEstudioPrize] = useState('Fone bluetooth do CS Music');
  const [artistPrize, setArtistPrize] = useState('Fone bluetooth do CS Music');
  const rouletteAudioUrl = 'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0472481079.firebasestorage.app/o/M%C3%BAsica%20da%20Roleta%2FPi%C3%A3o%20do%20Ba%C3%BA.MP3?alt=media&token=06cac443-bf73-444e-b95b-251b3a7446de';

  // Spinning and Game States
  const [showIntro, setShowIntro] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [previousRotation, setPreviousRotation] = useState(0);
  const [winningSector, setWinningSector] = useState<SectorData | null>(null);
  const [showOutcomeAnimation, setShowOutcomeAnimation] = useState(false);
  const [showThankYouScreen, setShowThankYouScreen] = useState(false);
  const [canSpinAgain, setCanSpinAgain] = useState(false);
  const [isWaitingDelay, setIsWaitingDelay] = useState(false);

  // References for managing audios
  const rouletteAudioRef = useRef<HTMLAudioElement | null>(null);
  const applauseAudioRef = useRef<HTMLAudioElement | null>(null);
  const disappointmentAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialVolumeRef = useRef<number>(volume);
  const wasPlayingRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rouletteAudioRef.current) {
        rouletteAudioRef.current.pause();
      }
      if (applauseAudioRef.current) {
        applauseAudioRef.current.pause();
      }
      if (disappointmentAudioRef.current) {
        disappointmentAudioRef.current.pause();
      }
    };
  }, []);

  // When result appears, play the background voting song at 0.15 volume
  useEffect(() => {
    if (showOutcomeAnimation && winningSector) {
      // Store current volume so we can restore it when exiting
      initialVolumeRef.current = volume;
      // Set to reduced volume
      setVolume(0.15);
      // Play global music if it's currently paused
      if (!isPlaying) {
        togglePlay();
      }
    }
  }, [showOutcomeAnimation, winningSector]);

  // Handle manual exit returning to main area without music playing
  const handleExitWithoutMusic = () => {
    if (rouletteAudioRef.current) {
      rouletteAudioRef.current.pause();
    }
    if (applauseAudioRef.current) {
      applauseAudioRef.current.pause();
    }
    if (disappointmentAudioRef.current) {
      disappointmentAudioRef.current.pause();
    }
    if (isPlaying) {
      togglePlay();
    }
    // Restore the volume level
    setVolume(initialVolumeRef.current || 0.8);
    onClose();
  };

  // Load configs
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'roulette', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sponsor1Name) setSponsor1Name(data.sponsor1Name);
          if (data.sponsor1Logo) setSponsor1Logo(data.sponsor1Logo);
          if (data.sponsor1Prize) setSponsor1Prize(data.sponsor1Prize);
          if (data.sponsor2Name) setSponsor2Name(data.sponsor2Name);
          if (data.sponsor2Logo) setSponsor2Logo(data.sponsor2Logo);
          if (data.sponsor2Prize) setSponsor2Prize(data.sponsor2Prize);
          if (data.csEstudioPrize) setCsEstudioPrize(data.csEstudioPrize);
          if (data.artistPrize) setArtistPrize(data.artistPrize);
        }
      } catch (err) {
        console.warn('Could not load roulette configs from Firestore:', err);
      }
    };
    fetchConfig();
  }, []);

  // Set up sectors
  const sectors: SectorData[] = [
    {
      id: 'try_again_2',
      label: 'Tente outra vez',
      logo: '',
      color: '#27272A',
      textColor: '#00E5FF',
      type: 'try_again'
    },
    {
      id: 'sponsor1',
      label: sponsor1Name,
      logo: sponsor1Logo,
      color: '#9D50BB',
      textColor: '#FFFFFF',
      type: 'sponsor1'
    },
    {
      id: 'not_this_time_1',
      label: 'Não foi desta vez',
      logo: '',
      color: '#1F1F22',
      textColor: '#A1A1AA',
      type: 'not_this_time'
    },
    {
      id: 'cs_estudio',
      label: 'CS Music',
      logo: 'https://lh3.googleusercontent.com/d/1E37nd5lZ180Zy_RijgYI_U1PIIkkM1Lu',
      color: '#FF2E93',
      textColor: '#FFFFFF',
      type: 'cs_estudio'
    },
    {
      id: 'try_again_1',
      label: 'Tente outra vez',
      logo: '',
      color: '#27272A',
      textColor: '#00E5FF',
      type: 'try_again'
    },
    {
      id: 'sponsor2',
      label: sponsor2Name,
      logo: sponsor2Logo,
      color: '#F5A623',
      textColor: '#09090B',
      type: 'sponsor2'
    },
    {
      id: 'not_this_time_2',
      label: 'Não foi desta vez',
      logo: '',
      color: '#1F1F22',
      textColor: '#A1A1AA',
      type: 'not_this_time'
    },
    {
      id: 'artist',
      label: votedArtist?.name || 'Artista Votado',
      logo: votedArtist?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      color: '#00E5FF',
      textColor: '#09090B',
      type: 'artist'
    }
  ];

  const spinWheel = () => {
    if (isSpinning || isWaitingDelay) return;

    setIsSpinning(true);
    setWinningSector(null);
    setShowOutcomeAnimation(false);
    setCanSpinAgain(false);
    setIsWaitingDelay(false);

    // Pause the background voting track before spinning starts
    wasPlayingRef.current = isPlaying;
    if (isPlaying) {
      togglePlay();
    }

    // Play "Pião do Baú" sound with a smooth fade-in
    if (rouletteAudioRef.current) {
      rouletteAudioRef.current.pause();
    }
    if (applauseAudioRef.current) {
      applauseAudioRef.current.pause();
    }
    if (disappointmentAudioRef.current) {
      disappointmentAudioRef.current.pause();
    }
    const audio = new Audio(rouletteAudioUrl);
    audio.volume = 0.0; // Start at 0 volume to prevent click or starting artifact
    rouletteAudioRef.current = audio;
    
    audio.play()
      .then(() => {
        // Ramp up volume from 0 to 1.0 over 1.5 seconds (1500ms)
        const fadeInDuration = 1500;
        const fadeInSteps = 15;
        const volumeIncrement = 1.0 / fadeInSteps;
        let currentStep = 0;
        
        const fadeInInterval = setInterval(() => {
          if (rouletteAudioRef.current === audio) {
            currentStep++;
            audio.volume = Math.min(1.0, currentStep * volumeIncrement);
            if (currentStep >= fadeInSteps) {
              clearInterval(fadeInInterval);
            }
          } else {
            clearInterval(fadeInInterval);
          }
        }, fadeInDuration / fadeInSteps);
      })
      .catch(err => console.warn("Failed to play roulette theme sound:", err));

    // Save current rotation to previousRotation so Framer Motion keyframes start from the right place
    setPreviousRotation(rotation);

    // Pick a random sector index to win
    let winningIdx = Math.floor(Math.random() * 8);

    const targetSector = sectors[winningIdx];

    // Determine target rotation
    // Pointer is at the top (0 degrees).
    // Each sector takes 45 degrees.
    // Landing on sector i means rotating the wheel by:
    // 360 - (i * 45) - 5 (to land 5 degrees inside the sector, right past the divider)
    const extraSpins = 22; // Spin more times to accommodate the 22 seconds duration
    const finalAngleInSector = 5; // Absolute rule of the roulette
    const sectorAngle = winningIdx * 45;
    const destinationAngle = (360 - sectorAngle - finalAngleInSector) % 360;
    
    const targetRotation = rotation + (extraSpins * 360) + destinationAngle;
    setRotation(targetRotation);

    const spinDuration = 22000; // 22 seconds of active spin!
    const postSpinDelay = 200; // 200ms delay so they have time to analyze how close it stopped to the line!

    // Fade out "Pião do Baú" audio gracefully over the last 4 seconds of the 22s spin (starting at 18 seconds)
    const fadeStartTimeout = setTimeout(() => {
      const fadeInterval = setInterval(() => {
        if (rouletteAudioRef.current) {
          if (rouletteAudioRef.current.volume > 0.05) {
            rouletteAudioRef.current.volume = Math.max(0, rouletteAudioRef.current.volume - 0.1);
          } else {
            rouletteAudioRef.current.volume = 0;
            clearInterval(fadeInterval);
          }
        }
      }, 300);
      
      setTimeout(() => clearInterval(fadeInterval), 4000);
    }, 18000);

    // Wait for the transition to complete
    setTimeout(() => {
      clearTimeout(fadeStartTimeout);
      
      // Stop theme sound completely
      if (rouletteAudioRef.current) {
        rouletteAudioRef.current.pause();
      }

      setIsSpinning(false);
      setIsWaitingDelay(true);

      // Play the custom applause sound exactly in the middle of this 1 second (500ms)
      // only if it landed on any of the specified prize sectors: artist, cs_estudio, sponsor1, sponsor2
      const isPrize = targetSector.type === 'artist' || 
                      targetSector.type === 'cs_estudio' || 
                      targetSector.type === 'sponsor1' || 
                      targetSector.type === 'sponsor2';
      
      if (isPrize) {
        if (applauseAudioRef.current) {
          applauseAudioRef.current.pause();
        }
        const applauseAudio = new Audio('https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0472481079.firebasestorage.app/o/M%C3%BAsica%20da%20Roleta%2FSom%20de%20aplausos.mp3?alt=media&token=e14d5e67-f264-4494-9d5a-74630bf17a6e');
        applauseAudio.volume = 1.0;
        applauseAudioRef.current = applauseAudio;
        applauseAudio.play().catch(err => console.warn("Failed to play applause sound:", err));
      } else if (targetSector.type === 'not_this_time') {
        if (disappointmentAudioRef.current) {
          disappointmentAudioRef.current.pause();
        }
        const disappointmentAudio = new Audio('https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0472481079.firebasestorage.app/o/M%C3%BAsica%20da%20Roleta%2FEfeito%20sonoro%20decep%C3%A7%C3%A3o.mp3?alt=media&token=a170e5e3-55f1-4b96-a25d-6fffdad6e71a');
        disappointmentAudio.volume = 1.0;
        disappointmentAudioRef.current = disappointmentAudio;
        disappointmentAudio.play().catch(err => console.warn("Failed to play disappointment sound:", err));
      }

      // Now we wait an additional delay for the participant to analyze where it stopped
      setTimeout(() => {
        setIsWaitingDelay(false);
        setWinningSector(targetSector);
        setShowOutcomeAnimation(true);

        // Handle outcomes
        if (targetSector.type === 'try_again') {
          // Habilita girar outra vez
          setCanSpinAgain(true);
        }
      }, postSpinDelay);
    }, spinDuration);
  };

  const isPrizeOutcome = winningSector && (
    winningSector.type === 'artist' || 
    winningSector.type === 'cs_estudio' || 
    winningSector.type === 'sponsor1' || 
    winningSector.type === 'sponsor2'
  );

  return (
    <div id="prize-roulette-fullscreen" className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white overflow-hidden select-none">
      <ConfettiEffect active={showOutcomeAnimation && isPrizeOutcome === true} />

      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md flex flex-col items-center justify-center bg-[#0B0B0C] border border-[#1F1F22] rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-center relative max-h-[92vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition duration-150 cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Sparkles / Title */}
            <div className="space-y-1 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3px]" /> Voto Confirmado!
              </div>
              <h2 className="text-lg sm:text-xl font-black font-sans tracking-tight text-white mt-1">
                Você votou com sucesso!
              </h2>
            </div>

            {/* Artist Card styled like the screenshot, smaller on mobile to fit perfectly */}
            <div className="flex flex-col items-center justify-center py-2 sm:py-4">
              <div className="relative">
                <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden border-3 sm:border-4 border-[#00E5FF] shadow-[0_0_30px_rgba(0,229,255,0.4)] flex items-center justify-center bg-neutral-900">
                  {votedArtist?.imageUrl ? (
                    <img
                      src={votedArtist.imageUrl}
                      alt={votedArtist.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Award className="w-10 h-10 sm:w-14 sm:h-14 text-neutral-400" />
                  )}
                </div>
                {/* ✓ VOTADO! Badge overlapping the bottom center */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 sm:px-4 sm:py-1.5 bg-[#00C853] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full shadow-[0_4px_12px_rgba(0,200,83,0.4)] border-2 border-[#0B0B0C] flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[4px]" />
                  <span>Votado!</span>
                </div>
              </div>
              
              <h3 className="text-lg sm:text-xl font-black text-white font-sans tracking-tight mt-4 sm:mt-6 text-center">
                {votedArtist?.name || 'Artista'}
              </h3>
              
              <p className="text-[10px] sm:text-[11px] font-black text-[#00E5FF] tracking-wider uppercase mt-1 text-center">
                {(() => {
                  const femaleArtists = ['anitta', 'pitty', 'marisa monte', 'ana vitória', 'ana vitoria', 'marilia', 'marília', 'luisa', 'luísa', 'ludmilla', 'ivete', 'claudia leitte', 'simone', 'simaria', 'joelma', 'gloria groove', 'pabllo'];
                  const lowerName = (votedArtist?.name || '').toLowerCase();
                  const isFemale = femaleArtists.some(f => lowerName.includes(f));
                  return `NA VOZ DEL${isFemale ? 'A' : 'E'} VIRA HIT!`;
                })()}
              </p>
            </div>

            {/* Explanatory text */}
            <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed font-medium px-2 sm:px-4">
              Agora que o seu voto foi registrado, você ganhou uma chance exclusiva de girar a nossa **Roleta da Sorte** para tentar ganhar brindes incríveis!
            </p>

            {/* Button to proceed */}
            <button
              id="btn-prosseguir-roleta"
              onClick={() => setShowIntro(false)}
              className="w-full py-3 sm:py-3.5 px-6 rounded-2xl text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-black bg-[#00E5FF] hover:bg-[#00E5FF]/90 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-xl shadow-[#00E5FF]/10 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Acessar Roleta da Sorte</span>
              <Gift className="w-4 h-4" />
            </button>
          </motion.div>
        ) : !showThankYouScreen ? (
          <motion.div
            key="wheel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg flex flex-col items-center justify-between h-full max-h-[90vh] py-6 relative"
          >
            {/* Header / Logo */}
            <div className="text-center space-y-1 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" /> Roleta da Sorte CS Music
              </div>
              <h2 className="text-xl font-black font-sans tracking-tight bg-gradient-to-r from-white via-neutral-100 to-[#00E5FF] bg-clip-text text-transparent">
                Gire e Ganhe Prêmios!
              </h2>
              <p className="text-[10px] text-neutral-400 font-bold">
                Você votou em <span className="text-[#00E5FF] font-black">{votedArtist?.name || 'seu artista preferido'}</span>. Agora, teste sua sorte!
              </p>
            </div>

            {/* Close Button during retry or before spinning */}
            {!isSpinning && !showOutcomeAnimation && (
              <button 
                onClick={onClose}
                className="absolute top-0 right-0 p-2 text-neutral-400 hover:text-white transition duration-150 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* --- THE WHEEL AREA --- */}
            <div className="relative my-auto flex flex-col items-center justify-center w-[340px] h-[340px] md:w-[380px] md:h-[380px]">
              {/* Outer glowing border ring */}
              <div className="absolute inset-0 rounded-full border-4 border-[#1F1F22] bg-[#050505] shadow-[0_0_60px_rgba(0,E5,FF,0.15)] pointer-events-none" />
              <div className="absolute inset-4 rounded-full border border-[#27272A] pointer-events-none" />

              {/* Top pointer indicator */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[20px] border-t-[#00E5FF]" />
                <div className="w-2 h-2 rounded-full bg-white absolute top-1.5 left-1/2 -translate-x-1/2" />
              </div>

              {/* Rotating Wheel Container */}
              <motion.div
                className="w-[280px] h-[280px] md:w-[320px] md:h-[320px] z-10 rounded-full overflow-hidden"
                style={{ originX: 0.5, originY: 0.5 }}
                animate={{ rotate: rotation }}
                transition={isSpinning ? { duration: 22, ease: [0.25, 1, 0.5, 1] } : { duration: 0 }}
              >
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full select-none"
                >
                  {/* Draw 8 sectors */}
                  {sectors.map((sector, index) => {
                    const startAngle = index * 45;
                    const endAngle = (index + 1) * 45;
                    const midAngle = startAngle + 22.5;
                    const labelPos = polarToCartesian(200, 200, 130, midAngle);

                    return (
                      <g key={sector.id}>
                        {/* Sector shape */}
                        <path
                          d={drawWedge(200, 200, 195, startAngle, endAngle)}
                          fill={sector.color}
                          stroke="#000000"
                          strokeWidth="2"
                        />
                        
                        {/* Sector content (rotated group pointing outwards) */}
                        <g transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${midAngle})`}>
                          {/* Inner icons/logos rendering */}
                          {sector.type === 'try_again' && (
                            <g transform="translate(-10, -32) scale(0.8)">
                              <circle cx="12" cy="12" r="10" fill="#00E5FF/10" />
                              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" stroke={sector.textColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                            </g>
                          )}

                          {sector.type === 'not_this_time' && (
                            <g transform="translate(-10, -32) scale(0.8)">
                              <circle cx="12" cy="12" r="10" fill="none" stroke={sector.textColor} strokeWidth="2.5" />
                              <path d="M16 16s-1.5-2-4-2-4 2-4 2" stroke={sector.textColor} strokeWidth="2.5" strokeLinecap="round" />
                              <line x1="9" y1="9" x2="9.01" y2="9" stroke={sector.textColor} strokeWidth="3" strokeLinecap="round" />
                              <line x1="15" y1="9" x2="15.01" y2="9" stroke={sector.textColor} strokeWidth="3" strokeLinecap="round" />
                            </g>
                          )}

                          {/* Render Sponsor and Artist small round logos */}
                          {sector.logo && (
                            <g transform="translate(-12, -36)">
                              <defs>
                                <clipPath id={`clip-${sector.id}`}>
                                  <circle cx="12" cy="12" r="11" />
                                </clipPath>
                              </defs>
                              <circle cx="12" cy="12" r="12" fill={sector.textColor} />
                              <image
                                href={sector.logo}
                                x="1"
                                y="1"
                                width="22"
                                height="22"
                                clipPath={`url(#clip-${sector.id})`}
                                referrerPolicy="no-referrer"
                              />
                            </g>
                          )}

                          {/* Sector label text */}
                          <text
                            x="0"
                            y={sector.label.length > 12 && sector.label.includes(' ') ? "4" : "10"}
                            textAnchor="middle"
                            fill={sector.textColor}
                            fontSize={sector.label.length > 15 ? "7" : sector.label.length > 12 ? "7.5" : "8.5"}
                            fontWeight="900"
                            letterSpacing="0.2"
                            fontFamily="sans-serif"
                            className="uppercase"
                          >
                            {sector.label.length > 12 && sector.label.includes(' ') ? (
                              <>
                                <tspan x="0" dy="0">{sector.label.split(' ').slice(0, Math.ceil(sector.label.split(' ').length / 2)).join(' ')}</tspan>
                                <tspan x="0" dy="9">{sector.label.split(' ').slice(Math.ceil(sector.label.split(' ').length / 2)).join(' ')}</tspan>
                              </>
                            ) : (
                              sector.label
                            )}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Draw center glowing pin */}
                  <circle cx="200" cy="200" r="42" fill="#09090B" stroke="#1F1F22" strokeWidth="4" />
                  <circle cx="200" cy="200" r="34" fill="#18181B" stroke="#00E5FF" strokeWidth="2" className="animate-pulse" />
                </svg>

                {/* Styled CS Music logo absolutely centered inside SVG */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
                  <div className="w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-full overflow-hidden border border-neutral-900 bg-black shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1E37nd5lZ180Zy_RijgYI_U1PIIkkM1Lu" 
                      alt="CS Music Logo" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* --- ACTION SPIN BUTTON --- */}
            <div className="w-full flex flex-col items-center space-y-4 z-10 pt-4">
              <button
                id="btn-girar-roleta"
                type="button"
                disabled={isSpinning || isWaitingDelay || (winningSector !== null && !canSpinAgain)}
                onClick={spinWheel}
                className={`w-full max-w-xs py-3.5 px-6 rounded-2xl text-xs font-extrabold uppercase tracking-widest text-black flex items-center justify-center gap-2 active:scale-95 transition-all duration-300 shadow-xl cursor-pointer ${
                  isSpinning || isWaitingDelay
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50 shadow-none'
                    : winningSector !== null && !canSpinAgain
                      ? 'bg-[#1F1F22] text-[#71717A] cursor-not-allowed shadow-none'
                      : 'bg-[#00E5FF] hover:bg-[#00E5FF]/90 shadow-[#00E5FF]/20'
                }`}
              >
                <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{(isSpinning || isWaitingDelay) ? 'Girando...' : canSpinAgain ? 'Girar Outra Vez!' : 'Girar Roleta!'}</span>
              </button>

              <p className="text-[9px] text-[#71717A] font-bold uppercase tracking-wider">
                Limites: 1 prêmio garantido por participação
              </p>
            </div>
          </motion.div>
        ) : (
          /* --- FINAL THANK YOU SCREEN --- */
          <motion.div
            key="thankyou"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm text-center py-12 px-6 bg-[#121214] border border-[#1F1F22] rounded-3xl space-y-8 flex flex-col items-center shadow-2xl z-25"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 text-[#00E5FF] flex items-center justify-center shadow-xl shadow-[#00E5FF]/5">
              <Check className="w-8 h-8 stroke-[3px] animate-bounce" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-black text-white tracking-tight">
                Voto & Participação Confirmados!
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                Muito obrigado por votar no CS Music e fazer parte do nosso festival de lançamentos originais.
              </p>
            </div>

            {/* Generous text display */}
            <div className="p-4 bg-[#18181B] border border-[#1F1F22] rounded-2xl w-full">
              <span className="text-sm font-black text-[#00E5FF] tracking-wider uppercase">
                Obrigado por participar do CS music!
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-5 bg-white text-black text-xs font-extrabold rounded-xl hover:bg-neutral-200 transition active:scale-95 shadow-lg shadow-white/5 cursor-pointer"
            >
              Fechar e Voltar ao Player
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- OUTCOME ANIMATION AND DIALOGS --- */}
      <AnimatePresence>
        {showOutcomeAnimation && winningSector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative w-full max-w-sm bg-[#121214] border-2 border-[#1F1F22] rounded-3xl p-6 shadow-2xl text-center space-y-6 text-white z-50 overflow-hidden"
            >
              {/* Highlight background radial gradient glow */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ background: `radial-gradient(circle, ${winningSector.color} 0%, transparent 70%)` }}
              />

              {/* Icon celebration */}
              <div className="flex justify-center">
                {winningSector.type === 'artist' || winningSector.type === 'cs_estudio' ? (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF2E93]/20 to-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
                    <Award className="w-8 h-8 animate-pulse" />
                  </div>
                ) : winningSector.type === 'try_again' ? (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <RotateCcw className="w-8 h-8" />
                  </div>
                ) : winningSector.type === 'not_this_time' ? (
                  <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
                    <Frown className="w-8 h-8" />
                  </div>
                ) : (
                  /* Sponsors */
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Gift className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Message logic translations */}
              <div className="space-y-3 relative z-10">
                <h4 className="text-[10px] tracking-widest uppercase font-black text-neutral-400">
                  {winningSector.type === 'try_again' ? 'Quase lá!' : winningSector.type === 'not_this_time' ? 'Resultado' : 'Parabéns! Você ganhou!'}
                </h4>

                {/* ANIMATION MESSAGE: caiu no artista votado ou no cs music */}
                {(winningSector.type === 'artist' || winningSector.type === 'cs_estudio') && (
                  <div className="space-y-4">
                    <p className="text-base font-black leading-snug">
                      Você acaba de ganhar um <span className="text-[#00E5FF] font-black">{csEstudioPrize || 'Fone bluetooth do CS Music'}</span>!
                    </p>
                    {winningSector.logo && (
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <img
                          src={winningSector.logo}
                          alt={winningSector.label}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#00E5FF]"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] text-neutral-400 font-bold">{winningSector.label}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ANIMATION MESSAGE: caiu nos patrocinadores */}
                {winningSector.type === 'sponsor1' && (
                  <div className="space-y-4">
                    <p className="text-base font-black leading-snug">
                      Você acaba de ganhar um lindo prêmio do <span className="text-[#9D50BB] font-black">{sponsor1Name}</span>: {sponsor1Prize}!
                    </p>
                    {sponsor1Logo && (
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <img
                          src={sponsor1Logo}
                          alt={sponsor1Name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#9D50BB]"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] text-neutral-400 font-bold">{sponsor1Name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ANIMATION MESSAGE: caiu nos patrocinadores 2 */}
                {winningSector.type === 'sponsor2' && (
                  <div className="space-y-4">
                    <p className="text-base font-black leading-snug">
                      Você acaba de ganhar um lindo prêmio do <span className="text-[#F5A623] font-black">{sponsor2Name}</span>: {sponsor2Prize}!
                    </p>
                    {sponsor2Logo && (
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <img
                          src={sponsor2Logo}
                          alt={sponsor2Name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#F5A623]"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[10px] text-neutral-400 font-bold">{sponsor2Name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ANIMATION MESSAGE: caiu no tente outra vez */}
                {winningSector.type === 'try_again' && (
                  <div className="space-y-2">
                    <p className="text-base font-black leading-snug text-amber-400">
                      Tente outra vez!
                    </p>
                    <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                      A roleta foi liberada para você girar mais uma vez. Boa sorte!
                    </p>
                  </div>
                )}

                {/* ANIMATION MESSAGE: caiu no não foi desta vez */}
                {winningSector.type === 'not_this_time' && (
                  <div className="space-y-2">
                    <p className="text-base font-black leading-snug text-neutral-300">
                      Não foi desta vez!
                    </p>
                    <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                      Não foi desta vez, mas obrigado por participar do CS music!
                    </p>
                  </div>
                )}
              </div>

              {/* Action/Dismiss */}
              <div className="relative z-10 pt-4 space-y-2.5">
                {winningSector.type === 'try_again' ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        // Pause background track before starting a new spin
                        if (isPlaying) {
                          togglePlay();
                        }
                        setShowOutcomeAnimation(false);
                      }}
                      className="w-full py-2.5 px-4 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black text-xs font-extrabold rounded-xl transition duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Girar Novamente
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleExitWithoutMusic}
                      className="w-full py-2.5 px-4 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl transition duration-150 active:scale-95 cursor-pointer"
                    >
                      Voltar ao Início
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleExitWithoutMusic}
                    className="w-full py-3 px-4 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black text-xs font-extrabold rounded-xl transition duration-150 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#00E5FF]/10"
                  >
                    Voltar ao Início
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

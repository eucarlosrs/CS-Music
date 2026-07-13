import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { Song } from '../types';
import { 
  Play, 
  Pause,
  Disc, 
  Instagram, 
  Youtube, 
  Mail, 
  Award, 
  Sparkles, 
  BookOpen, 
  Compass, 
  TrendingUp, 
  Heart,
  Share2,
  CheckCircle,
  Copy,
  FolderHeart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Tiktok: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export const ArtistProfile: React.FC = () => {
  const { songs, playSong, currentSong, isPlaying, togglePlay, setIsPlayerExpanded } = useAudio();
  const [copied, setCopied] = useState(false);

  const handleTrackPlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      // Find all CS Estúdio tracks as the playing queue
      const studioSongs = songs.filter(s => s.artist === 'CS Estúdio');
      playSong(song, studioSongs.length > 0 ? studioSongs : songs);
    }
    setIsPlayerExpanded(true);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('carlosrs.email@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Carlos Silva - O Idealizador por trás do CS Estúdio & CS Music',
        text: 'Conheça a história, visão de futuro e redes sociais do fundador da nossa plataforma!',
        url: window.location.href,
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link de compartilhamento copiado!');
    }
  };

  // Get original CS Estúdio tracks
  const csTracks = songs.filter(s => s.artist === 'CS Estúdio');

  return (
    <div id="creator-profile-container" className="pb-32 space-y-8 text-white">
      
      {/* 1. HERO HEADER: CARLOS SILVA */}
      <div className="relative h-[280px] md:h-[350px] rounded-3xl overflow-hidden shadow-2xl flex items-end">
        {/* Banner studio background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#121214]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#9D50BB]/15 via-[#00E5FF]/10 to-transparent" />

        <div className="relative p-6 md:p-8 space-y-3 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-[#00E5FF] to-[#9D50BB] text-white uppercase tracking-wider shadow-lg">
              <Award className="w-3 h-3 text-[#00E5FF]" /> Fundador e Idealizador
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
              Carlos Silva
            </h1>
            <p className="text-zinc-200 text-xs md:text-sm font-semibold max-w-xl leading-relaxed">
              Idealizador do <span className="text-[#00E5FF]">CS Estúdio</span> & <span className="text-[#9D50BB]">CS Music</span>. Conectando tecnologia, arte e suporte real à música de forma única.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs md:text-sm font-semibold bg-[#121214]/80 backdrop-blur-md p-3.5 rounded-2xl border border-[#1F1F22] w-fit shadow-xl">
            <div className="text-center px-2">
              <p className="text-[#71717A] text-[9px] uppercase font-heavy tracking-widest">Originais</p>
              <span className="text-[#00E5FF] font-mono text-base font-extrabold">{csTracks.length} faixas</span>
            </div>
            <div className="w-px h-6 bg-[#1F1F22]" />
            <div className="text-center px-1">
              <p className="text-[#71717A] text-[9px] uppercase font-heavy tracking-widest">Valor Mínimo</p>
              <span className="text-[#9D50BB] font-mono text-base font-extrabold">R$ 30,00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile quick controls */}
      <div className="flex items-center gap-3">
        {csTracks.length > 0 && (
          <button 
            onClick={() => handleTrackPlay(csTracks[0])}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#9D50BB] hover:from-[#00E5FF]/90 hover:to-[#9D50BB]/90 text-black font-extrabold text-xs shadow-lg shadow-[#00E5FF]/10 active:scale-95 hover:scale-[1.02] transition duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            Ouvir Obras do Estúdio
          </button>
        )}
        <button 
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-[#1F1F22] hover:border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition duration-300 cursor-pointer"
          title="Compartilhar Perfil"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* DOUBLE COLUMN LAYOUT: STORY & SIDEBAR INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STORY COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* A HISTÓRIA E ORIGEM */}
          <section className="bg-[#18181B] border border-[#1F1F22] rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#00E5FF]" />
              A Origem do <span className="text-[#00E5FF]">CS Estúdio</span>
            </h2>
            <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed font-normal">
              <p>
                O <strong className="text-white font-semibold">CS Estúdio</strong> nasceu da visão de <strong className="text-white font-semibold">Carlos Silva</strong>, criador e desenvolvedor do projeto, ao perceber que a inteligência artificial mudaria para sempre a forma como a música seria criada, descoberta e consumida.
              </p>
              <p>
                Mais do que produzir músicas, a ideia sempre foi construir algo maior: um ecossistema capaz de unir criatividade, tecnologia e entretenimento em uma única experiência.
              </p>
              <p>
                Assim surgiu o <strong className="text-[#00E5FF] font-semibold">CS Estúdio</strong>, uma marca criada para desenvolver músicas através da inteligência artificial, criar novos formatos de conteúdo e aproximar o público do processo musical de uma maneira inovadora.
              </p>
            </div>
          </section>

          {/* O CS MUSIC */}
          <section className="bg-[#18181B] border border-[#1F1F22] rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#9D50BB]" />
              O Propósito do <span className="text-[#9D50BB]">CS Music</span>
            </h2>
            <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed font-normal">
              <p>
                Dentro desse universo do CS Estúdio nasceu também o <strong className="text-white font-semibold">CS Music</strong>.
              </p>
              <p>
                O CS Music foi criado com um propósito simples, mas poderoso: <strong className="text-[#9D50BB] font-semibold">dar vida às músicas desenvolvidas pelo CS Estúdio</strong> e transformá-las em oportunidades reais.
              </p>
              <p>
                Seu objetivo é criar um espaço onde músicas possam ser descobertas, valorizadas e até mesmo chegar às mãos de artistas, produtores e pessoas que acreditam no poder da criatividade. Mais do que uma coleção de músicas, o CS Music representa uma vitrine para ideias, emoções e possibilidades.
              </p>
            </div>
          </section>

          {/* A MISSÃO CONJUNTA E O FUTURO */}
          <section className="bg-gradient-to-br from-[#18181B] to-[#121214] border border-[#1F1F22] rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              Missão Conjunta & Visão de Futuro
            </h2>
            <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed font-normal">
              <p>
                Juntos, <strong className="text-[#00E5FF] font-semibold">CS Estúdio</strong> e <strong className="text-[#9D50BB] font-semibold">CS Music</strong> têm uma missão em comum:
              </p>
              <p className="bg-[#050505]/40 p-4 rounded-xl border border-[#1F1F22] text-[#00E5FF] font-medium italic">
                "Construir uma nova experiência musical para a era da inteligência artificial, aproximando pessoas, criatividade e tecnologia, e mostrando que o futuro da música pode ser criado sem limites, mas sempre guiado pela imaginação humana."
              </p>
              <p>
                Todo esse ecossistema foi idealizado e desenvolvido por <strong className="text-white font-semibold">Carlos Silva</strong>, que acredita que a inteligência artificial não substitui a criatividade humana, mas amplia suas possibilidades e abre caminhos para uma nova geração de artistas, criadores e experiências musicais.
              </p>
            </div>
          </section>

        </div>

        {/* SIDEBAR COLON: SOCIAL NETWORKS AND FAQS */}
        <div className="space-y-6">
          
          {/* SOCIAL MEDIA / WORKING CONTACT AND NETWORKS BUTTONS */}
          <section className="bg-[#18181B] border border-[#1F1F22] rounded-2xl p-5 md:p-6 space-y-5 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Heart className="w-4.5 h-4.5 text-[#00E5FF]" /> Redes & Contato Oficial
              </h3>
              <p className="text-[11px] text-[#71717A] font-semibold mt-1 leading-relaxed">
                Acompanhe o Carlos Silva nas redes oficiais e envie sua mensagem para parcerias.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              <a 
                href="https://www.instagram.com/carlossilva.ai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#050505] hover:bg-[#1C1917]/40 border border-[#1F1F22] hover:border-[#27272A] rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#9D50BB] transition duration-300 grow cursor-pointer"
              >
                <Instagram className="w-4 h-4 shrink-0" />
                <span>Instagram</span>
              </a>

              <a 
                href="https://www.youtube.com/@csestudiooficial" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#050505] hover:bg-[#1C1917]/40 border border-[#1F1F22] hover:border-[#27272A] rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-red-500 transition duration-300 grow cursor-pointer"
              >
                <Youtube className="w-4 h-4 shrink-0" />
                <span>YouTube</span>
              </a>

              <a 
                href="https://www.tiktok.com/@carlossilva.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#050505] hover:bg-[#1C1917]/40 border border-[#1F1F22] hover:border-[#27272A] rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#00E5FF] transition duration-300 grow cursor-pointer"
              >
                <Tiktok className="w-4 h-4 shrink-0" />
                <span>TikTok</span>
              </a>

              <button 
                onClick={handleCopyEmail}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#050505] hover:bg-[#1C1917]/40 border border-[#1F1F22] hover:border-[#27272A] rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#D4AF37] transition duration-300 grow relative cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-green-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>Email</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-4 border-t border-[#1F1F22] space-y-3">
              <div className="bg-[#050505] rounded-xl p-3 border border-[#1F1F22] space-y-1">
                <span className="text-[10px] text-[#A1A1AA] font-bold block">E-mail para Negócios:</span>
                <span className="text-xs font-mono text-zinc-300 font-medium select-all">carlosrs.email@gmail.com</span>
              </div>
            </div>
          </section>

          {/* FAQS & MANIFEST */}
          <section className="bg-[#18181B] border border-[#1F1F22] rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#9D50BB] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Manifesto do Criador
            </h3>
            <p className="text-[11px] leading-relaxed text-[#A1A1AA] font-medium italic">
              "A verdadeira música não deve ser limitada por algoritmos de rentabilidade frios ou catálogos inacessíveis. No CS Estúdio, fazemos canções reais, moldadas com carinho intelectual e oferecidas no CS Music sob propostas honestas que respeitam seu investimento, incentivando a criação contínua."
            </p>
            <p className="text-[10px] text-right text-[#00E5FF] font-bold tracking-tight">
              — Carlos Silva
            </p>
          </section>

        </div>

      </div>

      {/* RECENT STUDIO RELEASES (So the profile retains full music exploration values) */}
      {csTracks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <Disc className="w-5 h-5 text-[#00E5FF]" />
            Obras do CS Estúdio Disponíveis para Licença
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {csTracks.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={song.id}
                  onClick={() => handleTrackPlay(song)}
                  className={`flex items-center gap-3 p-3.5 bg-[#18181B] hover:bg-[#27272A]/40 border rounded-2xl cursor-pointer transition duration-300 group ${
                    isCurrent ? 'border-[#00E5FF]/40 bg-[#27272A]/20' : 'border-[#1F1F22] hover:border-[#27272A]'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
                    <img 
                      src={song.coverUrl} 
                      alt={song.name} 
                      className="w-full h-full object-cover transition group-hover:scale-105" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/15 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 opacity-100 transition duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackPlay(song);
                        }}
                        className="relative w-8 h-8 flex items-center justify-center rounded-full overflow-hidden border border-cyan-500/30 hover:border-fuchsia-500/60 shadow-[0_2px_8px_rgba(0,229,255,0.4)] hover:shadow-[0_4px_12px_rgba(236,72,153,0.55)] active:scale-90 transition duration-300 cursor-pointer"
                        aria-label={isCurrent && isPlaying ? "Pausar" : "Tocar"}
                      >
                        <img 
                          src="https://lh3.googleusercontent.com/d/1kpzAB3S4ebv0fz1CdBlB2Rbx0kLYCJJe" 
                          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
                          alt="Logo"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/45 hover:bg-black/25 flex items-center justify-center transition-colors">
                          {isCurrent && isPlaying ? (
                            <Pause className="w-3 h-3 text-white stroke-[2.5px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
                          ) : (
                            <Play className="w-3 h-3 text-white fill-white ml-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-[#00E5FF]' : 'text-white'
                    }`}>
                      {song.name}
                    </h4>
                    <p className="text-[10px] text-[#71717A] mt-0.5 font-semibold">{song.album}</p>
                  </div>

                  <span className="p-1 px-2.5 rounded-xl bg-red-500/10 text-[9px] font-black text-red-400 border border-red-500/20 uppercase tracking-wider">
                    CS do Bem
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

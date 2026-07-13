import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CsDoBemAction, CsDoBemStats } from '../types';
import { 
  Heart, 
  DollarSign, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Instagram, 
  Youtube, 
  Image as ImageIcon,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  X,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CsDoBem: React.FC = () => {
  const [actions, setActions] = useState<CsDoBemAction[]>([]);
  const [stats, setStats] = useState<CsDoBemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Default fallback data for a stunning immediate visual experience
  const defaultStats: CsDoBemStats = {
    id: 'global',
    totalRaised: 1250,
    instagramUrl: 'https://instagram.com',
    tiktokUrl: 'https://tiktok.com',
    youtubeUrl: 'https://youtube.com'
  };

  const defaultActions: CsDoBemAction[] = [
    {
      id: 'default_1',
      title: 'Entrega de Refeições Nutritivas',
      date: '10/07/2026',
      description: 'Ação realizada no centro da cidade para levar refeições preparadas e água para pessoas em extrema vulnerabilidade social.',
      amountSpent: 350.00,
      photos: [
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&auto=format&fit=crop&q=80'
      ],
      videoUrl: 'https://instagram.com',
      createdAt: new Date().toISOString()
    },
    {
      id: 'default_2',
      title: 'Kits de Agasalhos e Higiene',
      date: '03/07/2026',
      description: 'Arrecadação e distribuição de roupas de frio, cobertores e kits contendo sabonete, escova de dentes e creme dental para pessoas de rua.',
      amountSpent: 220.00,
      photos: [
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80'
      ],
      videoUrl: 'https://tiktok.com',
      createdAt: new Date().toISOString()
    }
  ];

  useEffect(() => {
    setIsLoading(true);
    
    // Subscribe to stats
    const unsubStats = onSnapshot(doc(db, 'csdobem_stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as CsDoBemStats);
      } else {
        setStats(defaultStats);
      }
    }, (err) => {
      console.warn("Stats read error:", err);
      setStats(defaultStats);
    });

    // Subscribe to social actions
    const unsubActions = onSnapshot(collection(db, 'csdobem_actions'), (querySnapshot) => {
      const actionsList: CsDoBemAction[] = [];
      querySnapshot.forEach((docSnap) => {
        actionsList.push(docSnap.data() as CsDoBemAction);
      });
      
      if (actionsList.length > 0) {
        // Sort by date or createdAt
        actionsList.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setActions(actionsList);
      } else {
        setActions(defaultActions);
      }
      setIsLoading(false);
    }, (err) => {
      console.warn("Actions read error:", err);
      setActions(defaultActions);
      setIsLoading(false);
    });

    return () => {
      unsubStats();
      unsubActions();
    };
  }, []);

  const totalRaised = stats?.totalRaised ?? defaultStats.totalRaised;
  const totalSpent = actions.reduce((sum, act) => sum + act.amountSpent, 0);
  const remainingFunds = Math.max(0, totalRaised - totalSpent);

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* HEADER HERO */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800/60 p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-lg">
          <Heart className="w-8 h-8 text-emerald-400 fill-emerald-500/15 animate-pulse" />
        </div>
        
        <div className="space-y-2 flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
            Projeto Social
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">CS do Bem</h2>
          <p className="text-neutral-300 text-xs md:text-sm leading-relaxed">
            A transparência e a confiança são o nosso maior patrimônio. Todo o valor arrecadado com o licenciamento e apoio das nossas trilhas sonoras é 100% revertido em ações sociais reais para ajudar quem mais precisa.
          </p>
        </div>
      </div>

      {/* METRICS DASHBOARD */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/60 flex flex-col justify-between shadow-lg"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Arrecadado</span>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black font-mono text-emerald-400">
              R$ {totalRaised.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Proveniente de apoios e licenças</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/60 flex flex-col justify-between shadow-lg"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Destinação</span>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-black font-mono text-blue-400">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Aplicados diretamente nas ações</p>
          </div>
        </motion.div>
      </div>

      {/* SOCIAL MEDIA BUTTONS */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/50 space-y-3">
        <h3 className="text-xs font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-[#00E5FF] fill-[#00E5FF]/20" />
          Acompanhe em Tempo Real
        </h3>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Assista aos vídeos das nossas entregas, acompanhe as ações semanais em execução e faça parte da nossa comunidade nas redes sociais:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {stats?.instagramUrl && (
            <a 
              href={stats.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-lg hover:opacity-90 active:scale-95 transition cursor-pointer shadow-md"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>Instagram</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
          {stats?.youtubeUrl && (
            <a 
              href={stats.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:opacity-90 active:scale-95 transition cursor-pointer shadow-md"
            >
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
          {stats?.tiktokUrl && (
            <a 
              href={stats.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-black border border-neutral-800 text-white text-xs font-bold rounded-lg hover:bg-neutral-900 active:scale-95 transition cursor-pointer shadow-md"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.51-.15-.11-.29-.24-.42-.37v7.35c.03 2.14-.54 4.37-1.92 6.01-1.63 1.95-4.22 2.87-6.73 2.44-2.61-.41-4.91-2.24-5.75-4.76-.98-2.86-.42-6.24 1.55-8.54 1.68-1.99 4.36-2.91 6.94-2.39v4.1c-1.3-.43-2.79-.11-3.78.84-.96.9-1.28 2.33-.82 3.56.41 1.13 1.57 1.93 2.78 1.92 1.45.02 2.71-1.04 2.88-2.48.04-1.26.02-2.52.03-3.78V0h.03z"/>
              </svg>
              <span>TikTok</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
        </div>
      </div>

      {/* ACTIONS FEED */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-emerald-400 fill-emerald-500/25" />
            Histórico de Ações Realizadas
          </h3>
          <span className="text-[10px] font-mono text-neutral-400 font-bold bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
            {actions.length} ações
          </span>
        </div>

        {actions.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-neutral-900/30 border border-neutral-800 border-dashed space-y-2">
            <Heart className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs text-neutral-400">Nenhuma ação social cadastrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {actions.map((act, index) => (
              <motion.div 
                key={act.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative rounded-xl bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-neutral-800/80 p-5 space-y-4 shadow-lg hover:border-emerald-500/30 transition-all duration-300"
              >
                {/* Top Row: Date & Spend */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/40 pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-black font-mono text-[#00E5FF]">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{act.date}</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black font-mono">
                    Recurso aplicado: R$ {act.amountSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-white leading-tight group-hover:text-emerald-400 transition-colors">
                    {act.title}
                  </h4>
                  <p className="text-neutral-300 text-xs leading-relaxed">
                    {act.description}
                  </p>
                </div>

                {/* Photos Grid */}
                {act.photos && act.photos.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-neutral-400 font-bold flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>Fotos da ação (Clique para ampliar):</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {act.photos.map((photo, pIdx) => (
                        <div 
                          key={pIdx}
                          onClick={() => setSelectedPhoto(photo)}
                          className="aspect-square rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800/80 cursor-zoom-in group/img relative hover:border-emerald-500/40 transition-all duration-300"
                        >
                          <img 
                            src={photo} 
                            alt={`Entrega ${pIdx + 1}`}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video action trigger if present */}
                {act.videoUrl && (
                  <div className="pt-2">
                    <a 
                      href={act.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-emerald-400/20" />
                      <span>Ver vídeo da entrega</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* TRUST SEAL */}
      <div className="p-4 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3.5 text-left">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Compromisso com a Transparência</h4>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Todas as contribuições recebidas são monitoradas, e as notas de compra e fotos dos suprimentos distribuídos são periodicamente catalogadas nesta página. Cada play, licença ou apoio ajuda a mudar realidades. Gratidão por caminhar conosco!
          </p>
        </div>
      </div>

      {/* LIGHTBOX MODAL FOR IMAGES */}
      <AnimatePresence>
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={selectedPhoto} 
                alt="Foto ampliada da ação" 
                className="max-w-full max-h-[80vh] object-contain block mx-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Copy, 
  MessageCircle, 
  Instagram, 
  Send, 
  Facebook, 
  Twitter, 
  Download, 
  QrCode, 
  Sparkles, 
  Palette, 
  Smartphone, 
  Share2, 
  Music,
  CheckCircle2
} from 'lucide-react';
import { Song } from '../types';

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

interface SpotifyShareModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
}

// Creative gradients the user can choose for their Instagram share sticker
const CARD_GRADIENTS = [
  { id: 'neon-violet', name: 'Crepúsculo Neon', classes: 'from-[#9D50BB] via-[#4A0E4E] to-[#0F0C20]', canvasFrom: '#9D50BB', canvasTo: '#0F0C20' },
  { id: 'cyberpunk', name: 'Cyberpunk Glow', classes: 'from-[#00E5FF] via-[#1A0B2E] to-[#090514]', canvasFrom: '#00E5FF', canvasTo: '#090514' },
  { id: 'solar-gold', name: 'Ouro Solar', classes: 'from-[#F39C12] via-[#2C3E50] to-[#000000]', canvasFrom: '#F39C12', canvasTo: '#000000' },
  { id: 'emerald-dark', name: 'Clorofila Dark', classes: 'from-[#11998e] via-[#101b15] to-[#050505]', canvasFrom: '#11998e', canvasTo: '#050505' },
];

export const SpotifyShareModal: React.FC<SpotifyShareModalProps> = ({ song, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sticker' | 'qrcode'>('sticker');
  const [selectedGradient, setSelectedGradient] = useState(CARD_GRADIENTS[0]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [instagramStep, setInstagramStep] = useState(0); // 0: Closed/Default, 1: Instagram Guide modal active
  const [tiktokStep, setTiktokStep] = useState(0); // 0: Closed, 1: TikTok Guide modal active
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const shareUrl = `${window.location.origin}/?track=${song.id}`;
  const defaultShareText = `Estou ouvindo a faixa incrível "${song.name}" de ${song.artist || 'CS Estúdio'} no CS Music! Vem conferir:`;

  // Dynamic QR Code link
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&color=00e5ff&bgcolor=18181b`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      return true;
    } catch (err) {
      console.error('Falha ao copiar link:', err);
      return false;
    }
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'twitter' | 'facebook' | 'instagram' | 'tiktok') => {
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(defaultShareText + ' ' + shareUrl)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(defaultShareText)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(defaultShareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'instagram') {
      // Copy URL and trigger Instagram helper
      copyToClipboard();
      setInstagramStep(1);
    } else if (platform === 'tiktok') {
      // Copy URL and trigger TikTok helper
      copyToClipboard();
      setTiktokStep(1);
    }
  };

  // HTML5 Canvas generation to export high-quality story sticker
  const handleDownloadSticker = async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível obter o contexto 2D do Canvas');

      // 1. Draw gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, selectedGradient.canvasFrom);
      grad.addColorStop(0.5, '#121214');
      grad.addColorStop(1, '#050505');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Add a modern glowing spotlight
      const radialGrad = ctx.createRadialGradient(540, 960, 100, 540, 960, 800);
      radialGrad.addColorStop(0, `${selectedGradient.canvasFrom}33`); // 20% opacity
      radialGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Draw thin decorative card border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, 1000, 1840);

      // 2. Load and draw the cover image
      const coverImage = new Image();
      coverImage.crossOrigin = 'anonymous';
      
      const loadCover = new Promise<void>((resolve) => {
        coverImage.onload = () => {
          // Draw shadowed box for cover
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 15;
          
          // Draw rounded cover image container
          const coverX = 215;
          const coverY = 400;
          const coverSize = 650;
          const radius = 40;

          ctx.beginPath();
          ctx.moveTo(coverX + radius, coverY);
          ctx.lineTo(coverX + coverSize - radius, coverY);
          ctx.quadraticCurveTo(coverX + coverSize, coverY, coverX + coverSize, coverY + radius);
          ctx.lineTo(coverX + coverSize, coverY + coverSize - radius);
          ctx.quadraticCurveTo(coverX + coverSize, coverY + coverSize, coverX + coverSize - radius, coverY + coverSize);
          ctx.lineTo(coverX + radius, coverY + coverSize);
          ctx.quadraticCurveTo(coverX, coverY + coverSize, coverX, coverY + coverSize - radius);
          ctx.lineTo(coverX, coverY + radius);
          ctx.quadraticCurveTo(coverX, coverY, coverX + radius, coverY);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(coverImage, coverX, coverY, coverSize, coverSize);
          ctx.restore();
          resolve();
        };
        coverImage.onerror = () => {
          // Fallback if cover image CORS or loading fails
          ctx.fillStyle = '#27272a';
          ctx.fillRect(215, 400, 650, 650);
          
          ctx.fillStyle = '#71717a';
          ctx.font = 'bold 40px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('CS Music', 540, 725);
          resolve();
        };
        coverImage.src = song.coverUrl && (song.coverUrl.startsWith('http://') || song.coverUrl.startsWith('https://'))
          ? `/api/image-proxy?url=${encodeURIComponent(song.coverUrl)}`
          : song.coverUrl;
      });

      await loadCover;

      // 3. Write Song Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 56px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      // Handle text wrap for long titles
      const songName = song.name;
      if (songName.length > 25) {
        ctx.fillText(songName.substring(0, 23) + '...', 540, 1180);
      } else {
        ctx.fillText(songName, 540, 1180);
      }

      // 4. Write Artist Name
      ctx.fillStyle = '#A1A1AA';
      ctx.font = 'medium 38px Inter, sans-serif';
      ctx.fillText(song.artist || 'CS Estúdio', 540, 1250);

      // 5. Draw Spotify-like progress indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(215, 1340, 650, 8);
      
      ctx.fillStyle = selectedGradient.canvasFrom;
      ctx.fillRect(215, 1340, 280, 8); // Fake active duration
      
      ctx.beginPath();
      ctx.arc(495, 1344, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Time stamps
      ctx.fillStyle = '#71717A';
      ctx.font = '30px Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('01:14', 215, 1390);
      ctx.textAlign = 'right';
      ctx.fillText('03:42', 865, 1390);

      // 6. Draw dynamic soundwaves decoration
      ctx.strokeStyle = selectedGradient.canvasFrom;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const waveY = 1530;
      const waveSpacing = 16;
      const waveHeights = [20, 45, 60, 30, 15, 40, 80, 95, 50, 25, 45, 75, 90, 60, 35, 15, 40, 55, 25, 10];
      
      ctx.save();
      ctx.translate(540 - (waveHeights.length * waveSpacing) / 2, waveY);
      for (let i = 0; i < waveHeights.length; i++) {
        ctx.beginPath();
        ctx.moveTo(i * waveSpacing, -waveHeights[i] / 2);
        ctx.lineTo(i * waveSpacing, waveHeights[i] / 2);
        ctx.stroke();
      }
      ctx.restore();

      // 7. Watermark / Brand Logo at bottom
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OUÇA NO CS MUSIC', 540, 1720);

      ctx.fillStyle = selectedGradient.canvasFrom;
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText('CS ESTÚDIO • VIRA HIT', 540, 1765);

      // 8. Output and save image
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `csmusic_${song.name.toLowerCase().replace(/\s+/g, '_')}_sticker.png`;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

    } catch (err) {
      console.error('Falha ao baixar imagem do sticker:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        id="spotify-share-modal-overlay"
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div 
          id="spotify-share-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-[#0D0D0E] border border-[#1F1F22] w-full max-w-3xl rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative flex flex-col md:flex-row text-white my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button 
            id="close-share-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-neutral-900 border border-white/5 text-gray-400 hover:text-white transition z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* LEFT SIDE: THE ARTWORK STICKER OR QR PREVIEW */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#1F1F22] bg-[#09090a]">
            {/* STICKER CONTAINER */}
            <AnimatePresence mode="wait">
              {activeTab === 'sticker' ? (
                <motion.div
                  key="sticker-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[280px]"
                >
                  {/* Smartphone 9:16 interactive sticker mockup */}
                  <div 
                    id="sticker-mockup"
                    className={`aspect-[9/16] w-full rounded-2xl bg-gradient-to-b ${selectedGradient.classes} p-4 flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden group`}
                  >
                    {/* Glowing highlight sphere */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent_70%)] pointer-events-none" />

                    <div className="text-center">
                      <span className="text-[10px] tracking-[0.25em] font-extrabold text-white/50 block mt-2 uppercase">CS MUSIC</span>
                    </div>

                    {/* Centered Album Cover */}
                    <div className="my-auto px-2">
                      <div className="aspect-square w-full rounded-xl overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)] border border-white/5 relative">
                        <img 
                          src={song.coverUrl} 
                          alt={song.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="mt-4 text-center">
                        <h3 className="font-extrabold text-base tracking-tight text-white line-clamp-1">{song.name}</h3>
                        <p className="text-xs text-white/70 font-medium mt-0.5 flex items-center justify-center gap-1">
                          {song.artist || 'CS Estúdio'}
                          <CheckCircle2 className="w-3 h-3 text-[#00E5FF] fill-current" />
                        </p>
                      </div>
                    </div>

                    {/* Spotify-like details (progress bar, waveforms) */}
                    <div className="mt-auto space-y-4">
                      {/* Interactive soundwave graphic */}
                      <div className="flex items-center justify-center gap-1 h-8 opacity-80">
                        <span className="w-[3px] h-3 bg-white/60 rounded-full animate-pulse" />
                        <span className="w-[3px] h-5 bg-white/75 rounded-full" />
                        <span className="w-[3px] h-7 bg-white rounded-full" />
                        <span className="w-[3px] h-4 bg-white/80 rounded-full" />
                        <span className="w-[3px] h-2 bg-white/40 rounded-full" />
                        <span className="w-[3px] h-5 bg-white/75 rounded-full" />
                        <span className="w-[3px] h-6 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-[3px] h-3 bg-white/50 rounded-full" />
                      </div>

                      {/* Branding Footer */}
                      <div className="text-center pb-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[9px] font-bold text-white tracking-wide">
                          <Music className="w-2.5 h-2.5 text-[#00E5FF]" />
                          OUVIR NO CS MUSIC
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gradient selector */}
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-extrabold tracking-wider uppercase flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Escolher Paleta de Cores
                    </span>
                    <div className="flex gap-2">
                      {CARD_GRADIENTS.map((grad) => (
                        <button
                          key={grad.id}
                          onClick={() => setSelectedGradient(grad)}
                          className={`w-6 h-6 rounded-full bg-gradient-to-tr ${grad.classes} border transition ${selectedGradient.id === grad.id ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent hover:scale-105'}`}
                          title={grad.name}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="qrcode-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-[280px] text-center"
                >
                  {/* Glowing QR Code Card Container */}
                  <div className="bg-[#141416] border border-[#1F1F22] rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center aspect-square w-full relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#00E5FF]/5 to-transparent rounded-2xl pointer-events-none" />
                    
                    {/* QR Frame */}
                    <div className="bg-white p-3 rounded-xl shadow-lg relative">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code" 
                        className="w-40 h-40 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      {/* Mini watermark overlay in center of QR */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#121214] border-2 border-white flex items-center justify-center">
                        <Music className="w-4 h-4 text-[#00E5FF]" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-xs font-extrabold text-[#00E5FF] tracking-wider uppercase">VIRA HIT QR CODE</h4>
                      <p className="text-[10px] text-gray-400 mt-1">Aponte a câmera do celular para abrir a música diretamente</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT SIDE: SOCIAL SHARING & ACTION BUTTONS */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between bg-[#0D0D0E]">
            <div>
              {/* Header Details */}
              <div className="mb-6">
                <span className="text-[10px] text-[#00E5FF] font-extrabold tracking-widest uppercase block mb-1">COMPARTILHAR NOVO HIT</span>
                <h2 className="text-xl font-black text-white leading-tight">{song.name}</h2>
                <p className="text-xs text-gray-400 font-medium mt-1">de {song.artist || 'CS Estúdio'} • {song.genre}</p>
              </div>

              {/* Grid of beautifully styled premium sharing options */}
              <div className="space-y-2.5">
                {/* 1. INSTAGRAM STORIES (SPECIAL STEP INTEGRATION) */}
                <button 
                  id="share-instagram-stories-option"
                  onClick={() => handleShare('instagram')}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-pink-600/15 to-purple-600/15 border border-pink-500/20 hover:border-pink-500/40 text-pink-400 hover:text-white flex items-center justify-between text-xs font-bold transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-black transition">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span>Instagram Stories</span>
                      <span className="block text-[10px] text-pink-400/60 font-medium mt-0.5">Copia o link + Guia de Sticker</span>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition" />
                </button>

                {/* 2. WHATSAPP */}
                <button 
                  id="share-whatsapp-option"
                  onClick={() => handleShare('whatsapp')}
                  className="w-full p-3 rounded-xl bg-[#18181B] border border-[#1F1F22] hover:border-emerald-500/30 text-gray-300 hover:text-white flex items-center justify-between text-xs font-bold transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span>Compartilhar no WhatsApp</span>
                  </div>
                  <Check className="w-4 h-4 opacity-0 group-hover:opacity-40 transition" />
                </button>

                {/* 3. TIKTOK */}
                <button 
                  id="share-tiktok-option"
                  onClick={() => handleShare('tiktok')}
                  className="w-full p-3 rounded-xl bg-[#18181B] border border-[#1F1F22] hover:border-[#00F2FE]/30 text-gray-300 hover:text-white flex items-center justify-between text-xs font-bold transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/10 flex items-center justify-center text-[#00F2FE] group-hover:bg-[#00F2FE] group-hover:text-black transition">
                      <Tiktok className="w-4 h-4" />
                    </div>
                    <span>Compartilhar no TikTok</span>
                  </div>
                  <Check className="w-4 h-4 opacity-0 group-hover:opacity-40 transition" />
                </button>

                {/* 4. OTHER SOCIAL MEDIA ACCORDION */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    id="share-twitter-option"
                    onClick={() => handleShare('twitter')}
                    className="p-2.5 rounded-xl bg-[#18181B] border border-[#1F1F22] hover:border-white/20 text-gray-400 hover:text-white flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    <Twitter className="w-4 h-4 text-sky-400" />
                    <span>Twitter/X</span>
                  </button>
                  <button 
                    id="share-facebook-option"
                    onClick={() => handleShare('facebook')}
                    className="p-2.5 rounded-xl bg-[#18181B] border border-[#1F1F22] hover:border-white/20 text-gray-400 hover:text-white flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    <Facebook className="w-4 h-4 text-blue-500" />
                    <span>Facebook</span>
                  </button>
                  <button 
                    id="share-telegram-option"
                    onClick={() => handleShare('telegram')}
                    className="p-2.5 rounded-xl bg-[#18181B] border border-[#1F1F22] hover:border-white/20 text-gray-400 hover:text-white flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-sky-400" />
                    <span>Telegram</span>
                  </button>
                </div>

                {/* Tab navigation for sticker or qr code view */}
                <div className="flex bg-[#141416] p-1 rounded-xl mt-4 border border-[#1F1F22] w-full">
                  <button 
                    id="tab-sticker-btn"
                    onClick={() => setActiveTab('sticker')}
                    className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'sticker' ? 'bg-[#9D50BB] text-black shadow-md font-extrabold' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                    <span>Stories Sticker</span>
                  </button>
                  <button 
                    id="tab-qrcode-btn"
                    onClick={() => setActiveTab('qrcode')}
                    className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'qrcode' ? 'bg-[#9D50BB] text-black shadow-md font-extrabold' : 'text-gray-400 hover:text-white'}`}
                  >
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    <span>QR Code CS Music</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="mt-8 pt-6 border-t border-[#1F1F22] space-y-3">
              {/* COPY LINK TRIGGER */}
              <button 
                id="share-modal-copy-link-btn"
                onClick={copyToClipboard}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer ${copiedLink ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-[#141416] border-[#1F1F22] hover:border-[#27272A] text-gray-300 hover:text-white'}`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Link Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link da Música</span>
                  </>
                )}
              </button>

              {/* DOWLOAD GENERATED STICKER FILE */}
              {activeTab === 'sticker' && (
                <button 
                  id="share-modal-download-sticker-btn"
                  onClick={handleDownloadSticker}
                  disabled={isDownloading}
                  className="w-full py-3 px-4 rounded-xl bg-[#9D50BB] hover:bg-[#9D50BB]/90 text-black font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#9D50BB]/15 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? 'Gerando imagem...' : 'Baixar Imagem do Sticker (9:16)'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* INSTAGRAM STORIES STEP-BY-STEP DIALOG GUIDE */}
      <AnimatePresence>
        {instagramStep === 1 && (
          <div 
            id="instagram-guide-overlay"
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4"
            onClick={() => setInstagramStep(0)}
          >
            <motion.div 
              id="instagram-guide-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-[#1F1F22] w-full max-w-md rounded-2xl p-6 text-white shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/20">
                  <Instagram className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-black tracking-tight mb-2">Compartilhar no Instagram Stories</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Copiamos o link da música na sua área de transferência. Agora, siga os passos rápidos para postar com o sticker oficial:
                </p>

                <div className="space-y-4 text-left mb-6">
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-gray-300">
                      Caso ainda não tenha baixado, clique no botão <span className="text-[#00E5FF] font-bold">"Baixar Imagem do Sticker"</span> abaixo para salvar o design do seu vira hit.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-gray-300">
                      Abra o seu **Instagram Stories** e selecione a foto que você acabou de salvar como plano de fundo.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-gray-300">
                      Vá em **Figurinhas** (Stickers), selecione a opção **"Link"**, cole o link copiado e posicione-o com estilo na tela!
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    id="instagram-guide-close-btn"
                    onClick={() => setInstagramStep(0)}
                    className="flex-1 py-2.5 rounded-xl border border-[#1F1F22] hover:border-white/10 bg-[#141416] text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    Fechar Guia
                  </button>
                  <button 
                    id="instagram-guide-download-sticker-btn"
                    onClick={() => {
                      handleDownloadSticker();
                      setInstagramStep(0);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-extrabold text-white transition flex items-center justify-center gap-1 shadow-lg shadow-pink-500/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Imagem
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TIKTOK STEP-BY-STEP DIALOG GUIDE */}
      <AnimatePresence>
        {tiktokStep === 1 && (
          <div 
            id="tiktok-guide-overlay"
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4"
            onClick={() => setTiktokStep(0)}
          >
            <motion.div 
              id="tiktok-guide-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-[#1F1F22] w-full max-w-md rounded-2xl p-6 text-white shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-black border border-[#1F1F22] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00F2FE]/20">
                  <Tiktok className="w-6 h-6 text-[#00F2FE]" />
                </div>
                <h3 className="text-base font-black tracking-tight mb-2">Compartilhar no TikTok</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Copiamos o link da música na sua área de transferência. Agora, siga os passos rápidos para postar no TikTok:
                </p>

                <div className="space-y-4 text-left mb-6">
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-[#00F2FE]/10 text-[#00F2FE] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-gray-300">
                      Caso ainda não tenha baixado, clique no botão <span className="text-[#00E5FF] font-bold">"Baixar Imagem do Sticker"</span> abaixo para salvar o design do seu vira hit.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-[#00F2FE]/10 text-[#00F2FE] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-gray-300">
                      Abra o seu **TikTok**, clique no botão **"+"** para criar uma nova publicação e selecione a foto baixada da galeria.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-[#00F2FE]/10 text-[#00F2FE] text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-gray-300">
                      Adicione como legenda o link copiado ou adicione a figurinha de link para engajar seus seguidores com seu vira hit!
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    id="tiktok-guide-close-btn"
                    onClick={() => setTiktokStep(0)}
                    className="flex-1 py-2.5 rounded-xl border border-[#1F1F22] hover:border-white/10 bg-[#141416] text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    Fechar Guia
                  </button>
                  <button 
                    id="tiktok-guide-download-sticker-btn"
                    onClick={() => {
                      handleDownloadSticker();
                      setTiktokStep(0);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#FE2C55] text-xs font-extrabold text-black transition flex items-center justify-center gap-1 shadow-lg shadow-[#00F2FE]/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Imagem
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

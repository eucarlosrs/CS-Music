import React, { useState, useEffect } from 'react';
import { Song, LicensingRequest } from '../types';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  X, 
  CheckCircle, 
  ShieldCheck, 
  Send, 
  Loader2, 
  Copy, 
  Check, 
  MessageSquare,
  Lock,
  Unlock,
  Clock,
  Sparkles,
  AlertCircle,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LicensingModalProps {
  song: Song;
  onClose: () => void;
}

export const LicensingModal: React.FC<LicensingModalProps> = ({ song, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [offerValue, setOfferValue] = useState('20');
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  // Mercado Pago States
  const [paymentId, setPaymentId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | 'cancelled' | ''>('');
  const [isSandboxPayment, setIsSandboxPayment] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [qrCodeBase64, setQrCodeBase64] = useState('');
  const [countdown, setCountdown] = useState(10); // Countdown for simulation auto-approval

  // Constants provided by user for Direct Contact
  const MY_WHATSAPP_NUMBER = "5519999621037"; // formatted with 55 country code
  const PIX_KEY_EMAIL = "eucarlosrs@gmail.com";
  const PIX_BENEFICIARY = "Carlos Roberto da Silva";

  // Phone validation & format (11 digits: (XX) XXXXX-XXXX)
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // CPF Validation & format (11 digits: XXX.XXX.XXX-XX)
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  // Polling Payment Status
  useEffect(() => {
    if (!paymentId || paymentStatus === 'approved') return;

    let isMounted = true;
    
    // Periodical checker (runs every 3 seconds for ultra-responsive update)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercado-pago/payment-status/${paymentId}`);
        if (!res.ok) throw new Error("Erro ao consultar status");
        
        const data = await res.json();
        if (isMounted) {
          if (data.status === 'approved') {
            setPaymentStatus('approved');
            clearInterval(interval);
          } else if (data.status === 'rejected' || data.status === 'cancelled') {
            setPaymentStatus(data.status);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar status do pagamento:", err);
      }
    }, 3000);

    // Countdown for simulation auto-approval visual helper
    let countdownInterval: NodeJS.Timeout;
    if (isSandboxPayment) {
      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [paymentId, paymentStatus, isSandboxPayment]);

  // Sync to Firestore on successful payment status
  useEffect(() => {
    if (paymentStatus === 'approved' && paymentId) {
      const updateFirestore = async () => {
        try {
          const docId = paymentId.startsWith('sim_') ? paymentId : `mp_${paymentId}`;
          const docRef = doc(db, 'licensing_requests', docId);
          await setDoc(docRef, { 
            status: 'Pago', 
            approvedAt: new Date().toISOString() 
          }, { merge: true });
        } catch (e) {
          console.error("Erro ao atualizar status no Firestore:", e);
        }
      };
      updateFirestore();
    }
  }, [paymentStatus, paymentId]);

  // WhatsApp Trigger with payment credentials
  const triggerWhatsApp = (value: number) => {
    if (paymentStatus !== 'approved') return;

    const paymentInfo = `✅ CONTRIBUIÇÃO SOLIDÁRIA REGISTRADA & APROVADA\n- Mercado Pago ID: ${paymentId}\n- Tipo: Pix Automático ${isSandboxPayment ? '(Simulado)' : ''}`;

    const textMsg = 
      `Olá Carlos! 👋\n` +
      `Acabei de fazer uma contribuição solidária para o projeto *CS do Bem* no valor de *R$ ${value.toFixed(2)}* para ajudar pessoas necessitadas em situações vulneráveis e de rua!\n\n` +
      `Como forma de agradecimento, selecionei a trilha *${song.name}* para licenciar no *CS Music*! ❤️\n\n` +
      `*Comprovante de Contribuição:* \n${paymentInfo}\n\n` +
      `*Dados do Licenciado:*\n` +
      `- *Nome Completo:* ${fullName}\n` +
      `- *CPF:* ${cpf}\n` +
      `- *WhatsApp de Contato:* ${phone}\n` +
      `- *Trilha Escolhida:* ${song.name}\n` +
      `${message ? `- *Mensagem para o Projeto:* "${message}"\n` : ''}\n` +
      `O pagamento já foi validado pelo Mercado Pago. Fico no aguardo do envio dos arquivos originais em alta definição (WAV + MP3) e do contrato de Licença CS Indeterminada (vitalícia e não exclusiva) para o meu uso! 🚀\n\n` +
      `Que Deus abençoe grandemente o projeto CS do Bem! 🙏`;

    const waUrl = `https://api.whatsapp.com/send?phone=${MY_WHATSAPP_NUMBER}&text=${encodeURIComponent(textMsg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !cpf || !offerValue) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const valueNum = parseFloat(offerValue);
    if (isNaN(valueNum) || valueNum < 1) {
      setErrorMessage('Por favor, insira uma contribuição de pelo menos R$ 1,00 para gerar o Pix.');
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      setErrorMessage('Por favor, insira um CPF válido com 11 dígitos.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Call Full-Stack Backend API to Register/Create the Mercado Pago payment
      const res = await fetch("/api/mercado-pago/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName,
          phone,
          cpf: cleanCpf,
          offerValue: valueNum,
          songName: song.name,
          songId: song.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro de comunicação com o Mercado Pago.");
      }

      setPaymentId(data.id);
      setPaymentStatus(data.status || 'pending');
      setIsSandboxPayment(!!data.isSandbox);
      setPixCode(data.qr_code);
      setQrCodeBase64(data.qr_code_base64 || '');
      setCountdown(10); // Reset countdown
      
      // Save initial record to Firestore
      const docId = data.isSandbox ? data.id : `mp_${data.id}`;
      const payload: LicensingRequest = {
        id: docId,
        fullName,
        email: `${cleanCpf}@csestudio.com.br`, 
        phone,
        songId: song.id,
        songName: song.name,
        purpose: `Contribuição CS do Bem + Licença CS Indeterminada: R$ ${valueNum.toFixed(2)} [Mercado Pago Pix]`,
        audioFormat: 'WAV + MP3 com Contrato de Licença CS Indeterminada',
        message: message || '',
        offerValue: valueNum,
        status: 'Novo',
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'licensing_requests', docId), payload);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error creating payment:", err);
      setErrorMessage(err.message || 'Erro de rede ao processar o pagamento no Mercado Pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // Helper to force simulation approval instantly
  const handleForceSimulationApproval = async () => {
    if (!isSandboxPayment) return;
    try {
      setPaymentStatus('approved');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseAttempt = () => {
    if (paymentStatus === 'approved' && !showExitWarning) {
      setShowExitWarning(true);
    } else {
      onClose();
    }
  };

  // Dynamic QR Code Rendering URL (uses Base64 returned from Mercado Pago or qrserver as fallback)
  const qrCodeUrl = qrCodeBase64 
    ? `data:image/png;base64,${qrCodeBase64}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`;

  const currentOfferFloat = parseFloat(offerValue) || 30;

  return (
    <div id="licensing-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-[0_0_60px_rgba(0,229,255,0.2)] scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
      >
        {/* Close Button */}
        <button 
          id="close-modal-btn"
          onClick={handleCloseAttempt}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {showExitWarning ? (
            <motion.div
              key="exit-warning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 text-center space-y-6"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                <AlertCircle className="w-9 h-9 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">
                  Atenção: Envie o comprovante de contribuição!
                </h3>
                <p className="text-neutral-300 text-xs md:text-sm leading-relaxed px-4">
                  Você precisa enviar a mensagem de confirmação no WhatsApp com o comprovante de contribuição para que a equipe do projeto <strong>CS do Bem</strong> possa enviar a sua trilha em alta definição (WAV) e o seu contrato de Licença CS Indeterminada (Uso vitalício e não exclusivo). Aproveite para acompanhar as nossas ações em execução nas nossas redes sociais!
                </p>
                <p className="text-neutral-400 text-[11px] leading-relaxed px-4">
                  Se você fechar ou sair do site sem enviar a mensagem no WhatsApp, o recebimento da sua trilha e o agradecimento poderão sofrer atrasos.
                </p>
              </div>

              <div className="space-y-3 max-w-sm mx-auto pt-2">
                {/* WHATSAPP ACTION */}
                <button 
                  onClick={() => triggerWhatsApp(currentOfferFloat)}
                  className="w-full py-3.5 text-sm font-black rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95 transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4.5 h-4.5 fill-black" />
                  ENVIAR NO WHATSAPP AGORA
                </button>

                {/* CLOSE ANYWAY */}
                <button 
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Já enviei / Fechar mesmo assim
                </button>

                {/* BACK TO PAYMENT SCREEN */}
                <button 
                  onClick={() => setShowExitWarning(false)}
                  className="w-full py-2 text-[11px] font-medium text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
                >
                  Voltar para tela de pagamento
                </button>
              </div>
            </motion.div>
          ) : !isSuccess ? (
            <motion.form 
              id="licensing-request-form"
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Header */}
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <Heart className="w-3.5 h-3.5 fill-emerald-500/10 text-emerald-400" />
                  Contribuição Solidária - Projeto CS do Bem ❤️
                </span>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  Apoie o Projeto & Licencie <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#9D50BB]">{song.name}</span>
                </h2>
                
                {/* Beautiful licensing terms box */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2 text-left">
                  <div className="text-[#00E5FF] font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                    Projeto Social <span className="text-[#9D50BB]">CS do Bem</span>
                  </div>
                  <div className="text-white text-sm font-bold leading-snug">
                    Direito de regravação (WAV/MP3) com toda documentação inclusa e apoio ao projeto social!
                  </div>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Toda semana, o projeto <strong className="text-[#9D50BB]">CS do Bem</strong> realiza ações para levar apoio e ajudar pessoas necessitadas em situações vulneráveis e de rua. Convidamos você a ver esse lindo projeto em execução e acompanhar as nossas ações pelas redes sociais! Contribua com o valor que sentir no coração e, em agradecimento, garanta o direito ao seu contrato de <strong>Licença CS Indeterminada</strong> para regravar a música, recebendo os arquivos originais em altíssima definição junto a toda documentação da música.
                  </p>
                </div>

                <p className="text-neutral-300 text-xs md:text-[13px] leading-relaxed">
                  Sem taxas comerciais ou obrigatoriedades! <strong>Contribua com a quantia que sentir em seu coração</strong> para apoiar o projeto social. O Pix é processado automaticamente e sua trilha é enviada com rapidez.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form inputs */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-300">Seu Nome Completo *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Carlos Silva"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-[#00E5FF] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-300">Telefone / WhatsApp *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="Ex: (19) 98888-7777"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-[#00E5FF] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none transition font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-300">Seu CPF (Exigido pelo Mercado Pago Pix) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: 000.000.000-00"
                      value={cpf}
                      onChange={handleCpfChange}
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-[#00E5FF] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300">Valor do Pix (O que sentir no coração) *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-sm font-black text-[#00E5FF] font-mono">R$</span>
                      <input 
                        type="number" 
                        required
                        min="1"
                        step="any"
                        placeholder="Ex: 20.00"
                        value={offerValue}
                        onChange={e => setOfferValue(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-[#00E5FF] rounded-xl text-sm text-white focus:outline-none transition font-black font-mono text-[#00E5FF]"
                      />
                    </div>
                    {/* Predefined donation presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[5, 10, 20, 50, 100].map((val) => {
                        const isSelected = parseFloat(offerValue) === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setOfferValue(val.toString())}
                            className={`px-3 py-1.5 text-xs font-black font-mono rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#00E5FF]/25 text-[#00E5FF] border-[#00E5FF]/60'
                                : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:bg-neutral-900 hover:text-white'
                            }`}
                          >
                            R$ {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300">Mensagem de apoio / Observações (Opcional)</label>
                  <textarea 
                    rows={2}
                    placeholder="Deixe uma mensagem de apoio ao projeto ou observações sobre o uso da trilha..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-[#00E5FF] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none transition resize-none font-medium"
                  />
                </div>
              </div>

              {/* Cover mini banner */}
              <div className="flex items-center gap-3 p-3 bg-neutral-950 rounded-2xl border border-neutral-800/50">
                <img 
                  src={song.coverUrl} 
                  alt={song.name} 
                  className="w-12 h-12 rounded-lg object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[8.5px] text-neutral-400 font-medium font-mono uppercase tracking-wider">Trilha selecionada:</p>
                  <h4 className="text-sm font-semibold text-white truncate">{song.name}</h4>
                  <p className="text-xs text-neutral-500 truncate">{song.artist}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-[#00E5FF] font-mono">Alta Definição</span>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase">WAV/MP3 + Licença</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#9D50BB] text-black hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Iniciando Pix...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 fill-current" />
                      Gerar Pix Automático
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div 
              id="success-licensing-payload"
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-2 text-center space-y-5"
            >
              {/* Simulation Warning Banner */}
              {isSandboxPayment && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-xs text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Ambiente de Simulação de Pix</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">
                    O token do Mercado Pago não está configurado nas variáveis de ambiente (.env). 
                    O pagamento simula uma aprovação em <strong className="text-cyan-300 font-mono">{countdown}s</strong> para você testar a liberação e envio automático.
                  </p>
                  {paymentStatus !== 'approved' && (
                    <button 
                      onClick={handleForceSimulationApproval}
                      className="mt-1.5 px-3 py-1 bg-cyan-400/20 text-cyan-300 rounded text-[10px] font-bold hover:bg-cyan-400/30 transition cursor-pointer"
                    >
                      Aprovar Pix de Teste Agora ⚡
                    </button>
                  )}
                </div>
              )}

              {/* Status Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">
                  {paymentStatus === 'approved' ? (
                    <CheckCircle className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <Clock className="w-7 h-7 text-[#00E5FF] animate-pulse" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {paymentStatus === 'approved' ? 'Pagamento Aprovado!' : 'Aguardando Pagamento Pix'}
                </h3>
                <p className="text-neutral-400 text-xs px-4">
                  {paymentStatus === 'approved' 
                    ? `O Mercado Pago confirmou a sua contribuição solidária via Pix. Liberação concluída!` 
                    : `Use o QR Code ou copie a linha Pix para pagar. O sistema confirmará automaticamente em tempo real.`}
                </p>
              </div>

              {/* PIX Payment Center Box */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-4 text-left shadow-inner">
                
                {/* QR Code container with status overlay */}
                <div className="relative bg-white p-2.5 rounded-xl shadow-lg border border-neutral-800">
                  <img 
                    src={qrCodeUrl} 
                    alt="Pix QR Code" 
                    className={`w-36 h-36 sm:w-44 sm:h-44 object-contain transition duration-500 ${paymentStatus === 'approved' ? 'opacity-20 blur-[2px]' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  {paymentStatus === 'approved' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-500 font-bold p-2 text-center">
                      <CheckCircle className="w-12 h-12 drop-shadow" />
                      <span className="text-xs bg-neutral-900/90 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 mt-2 font-mono text-[9px] uppercase tracking-wider">Pago</span>
                    </div>
                  )}
                </div>

                {/* Live transaction feedback status line */}
                <div className="w-full flex items-center justify-center gap-2 py-1 px-3 rounded-lg bg-neutral-900 border border-neutral-800/80">
                  {paymentStatus === 'approved' ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Transação Concluída com Sucesso!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00E5FF]" />
                      <span>Sincronizando com o Banco Central...</span>
                    </div>
                  )}
                </div>

                {/* Pix Copy and Paste Box */}
                <div className="w-full space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider font-mono">PIX Copia e Cola</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={pixCode}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none font-mono truncate"
                    />
                    <button 
                      onClick={handleCopyPix}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                        copiedPix 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-[#00E5FF]/10 text-[#00E5FF] hover:bg-[#00E5FF]/20 border border-[#00E5FF]/20'
                      }`}
                    >
                      {copiedPix ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Summary of PIX Transfer details */}
                <div className="w-full border-t border-neutral-900 pt-3 text-xs space-y-2 font-medium">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">ID da Transação:</span>
                    <span className="text-neutral-300 font-mono font-bold text-[11px] truncate max-w-[180px]">{paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-mono">Beneficiário:</span>
                    <span className="text-neutral-300 font-bold">{isSandboxPayment ? 'Simulação Mercado Pago' : PIX_BENEFICIARY}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#00E5FF]/5 p-2 rounded-lg border border-[#00E5FF]/10">
                    <span className="text-[#00E5FF] font-semibold text-[11px] uppercase tracking-wider">Valor do Pix:</span>
                    <span className="text-[#00E5FF] font-black font-mono text-sm">R$ {currentOfferFloat.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* Dynamic locked/unlocked trigger action container */}
              <div className="space-y-3 max-w-sm mx-auto">
                <AnimatePresence mode="wait">
                  {paymentStatus !== 'approved' ? (
                    <motion.div 
                      key="locked"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-left space-y-2"
                    >
                      <div className="flex gap-2 items-center text-[#00E5FF] text-xs font-bold">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>Botão de WhatsApp Bloqueado</span>
                      </div>
                      <p className="text-[10.5px] text-neutral-400 leading-normal">
                        Conforme sua preferência de segurança, o botão de WhatsApp só é liberado <strong>após o Mercado Pago aprovar o Pix</strong>. O comprovante irá anexado na mensagem!
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="unlocked"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-left space-y-1"
                    >
                      <div className="flex gap-2 items-center text-emerald-400 text-xs font-bold">
                        <Unlock className="w-4 h-4 shrink-0 animate-bounce" />
                        <span>WhatsApp Desbloqueado!</span>
                      </div>
                      <p className="text-[10.5px] text-neutral-300 leading-normal">
                        Pagamento confirmado! Clique abaixo para notificar o projeto <strong>CS do Bem</strong> e receber os arquivos de altíssima definição mais o contrato.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5">
                  {/* WHATSAPP ACTION BUTTON */}
                  <button 
                    disabled={paymentStatus !== 'approved'}
                    onClick={() => triggerWhatsApp(currentOfferFloat)}
                    className={`w-full py-3.5 text-sm font-black rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                      paymentStatus === 'approved' 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95' 
                        : 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {paymentStatus === 'approved' ? (
                      <>
                        <MessageSquare className="w-4.5 h-4.5 fill-black" />
                        ENVIAR NO WHATSAPP COM COMPROVANTE
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        WhatsApp Bloqueado (Aguardando Pix)
                      </>
                    )}
                  </button>

                  {/* DONE ACTION */}
                  <button 
                    id="modal-success-done-btn"
                    onClick={handleCloseAttempt}
                    className="w-full py-2.5 text-xs font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
                  >
                    Voltar ao Player
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

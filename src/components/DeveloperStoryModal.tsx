/**
 * Sonic Thrust - Developer Story Modal ("Arquivo do Dev")
 * IDE / Terminal-styled overlay with neon cyberpunk aesthetics.
 * Opens when the player clicks the author's name in the footer.
 */

import React, { useEffect } from 'react';
import { X, ExternalLink, Gamepad2, Terminal } from 'lucide-react';

interface DeveloperStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperStoryModal: React.FC<DeveloperStoryModalProps> = ({ isOpen, onClose }) => {
  // ESC closes the modal while open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto select-none"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full max-h-[92vh] flex flex-col my-auto bg-[#070b16] border border-cyan-500/50 rounded-xl shadow-[0_0_40px_rgba(0,240,255,0.25),0_0_80px_rgba(255,0,127,0.12)] overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* IDE Window Titlebar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0a0f22] border-b border-cyan-500/30 shrink-0">
          {/* Traffic light window controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              title="Fechar (ESC)"
              className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-400 transition-colors cursor-pointer"
            />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            
            {/* IDE File Tab */}
            <div className="hidden sm:flex items-center gap-1.5 ml-3 px-2.5 py-0.5 rounded bg-[#070b16] border border-cyan-500/30 text-[11px] text-cyan-300">
              <Terminal size={12} className="text-cyan-400" />
              <span>arquivo_do_dev.log</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 animate-pulse" />
            </div>
          </div>

          {/* IDE Window Center Header */}
          <div className="text-center">
            <h2 className="text-sm sm:text-base font-bold font-orbitron text-white tracking-widest uppercase neon-text-cyan">
              Arquivo do Dev
            </h2>
            <p className="text-[10px] sm:text-[11px] font-mono text-cyan-400/90 tracking-wide uppercase">
              Nível de acesso: Desenvolvedor
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar (ESC)"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* IDE Code Buffer / Single Box Container */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-[#040711]">
          <div className="rounded-lg border border-cyan-500/30 bg-[#070c1a]/90 p-3.5 sm:p-5 space-y-4 shadow-inner text-gray-200 text-xs sm:text-[13px] leading-relaxed">
            
            {/* Terminal Header */}
            <div className="border-b border-cyan-500/20 pb-3">
              <div className="text-cyan-300 font-bold text-sm sm:text-base tracking-wider drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                === ARQUIVO DO DEV ===
              </div>
              <div className="text-emerald-400 font-semibold text-xs tracking-wide mt-0.5 flex items-center gap-1.5">
                <span className="text-gray-500">&gt;</span>
                <span>NÍVEL DE ACESSO: DESENVOLVEDOR</span>
                <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>

            {/* Section 1 */}
            <div className="space-y-2">
              <div className="text-cyan-300 font-bold tracking-wide">
                [🚀 DA FÍSICA AO RITMO: A ORIGEM DO SONIC THRUST]
              </div>
              <p className="text-gray-300">
                Tudo começou com o Gravity Lander, onde descobri duas coisas: pilotar com dois propulsores independentes é um desafio brutal e criar jogos dá um gozo enorme. Com o surgimento do &quot;vibe coding&quot;, deixei de perder horas na sintaxe pesada do código para assumir de vez o papel de Game Director — concentrando toda a energia na visão, no feeling e na experiência do jogador.
              </p>
              <p className="text-gray-300">
                O Sonic Thrust nasceu do desejo de evoluir essa mecânica de propulsão dupla, juntando-lhe a minha outra grande paixão: a criação musical com IA. A ideia era simples, mas exigente: a música tinha de dar vida ao jogo, e o ecrã tinha de pulsar mesmo se jogasses em silêncio.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-2">
              <div className="text-fuchsia-300 font-bold tracking-wide">
                [🎬 ADN RETRO E INSPIRAÇÕES ESCONDIDAS]
              </div>
              <p className="text-gray-300">
                Se prestares atenção aos detalhes visuais e ao comportamento da nave, vais encontrar pedaços das minhas maiores referências de cultura pop e arcade:
              </p>
              <ul className="space-y-1.5 pl-1 sm:pl-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong className="text-white">Sonic Boom:</strong> A onda de choque ao quebrar barreiras vem diretamente de Top Gun.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong className="text-white">Rastos de Fogo:</strong> A aceleração limite que deixa rastos flamejantes é uma homenagem a Regresso ao Futuro.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-fuchsia-400 font-bold">•</span>
                  <span><strong className="text-white">Power-ups &amp; Sintetizadores:</strong> O espírito clássico dos Arcades dos anos 80 ligado a uma banda sonora original esculpida faixa a faixa no Suno.</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-2">
              <div className="text-amber-300 font-bold tracking-wide">
                [⚡ DETALHES, OBSESSÕES E UM SEGREDO...]
              </div>
              <p className="text-gray-300">
                Perdi mais tempo do que seria sensato a afinar cada drop, a ajustar os reflexos de néon e a desenhar um Easter Egg tão bem escondido que talvez nunca venha a ser encontrado. Mas foi precisamente essa obsessão pelos pequenos detalhes que fez valer cada segundo.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-2">
              <div className="text-emerald-300 font-bold tracking-wide">
                [🎮 O ANTECESSOR — GRAVITY LANDER]
              </div>
              <p className="text-gray-300">
                Antes do néon e da velocidade sónica, havia apenas a gravidade impiedosa. Se queres testar a tua destreza pura num ambiente de carga e aterragens cirúrgicas, experimenta a minha criação anterior.
              </p>
              
              {/* Interactive Button */}
              <div className="pt-1.5">
                <a
                  href="https://gravity-lander.ai.studio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 w-full px-4 py-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-400/60 hover:border-cyan-300 text-cyan-300 hover:text-white font-mono text-xs sm:text-sm font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.55)] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">&gt;</span>
                    <Gamepad2 size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>JOGAR GRAVITY LANDER</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-400 group-hover:text-cyan-200 text-xs">
                    <span>EXECUTAR</span>
                    <ExternalLink size={14} className="shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </a>
              </div>
            </div>

            {/* Footer Divider & Secret Note */}
            <div className="pt-2 border-t border-cyan-500/20 text-gray-400 text-[11px] sm:text-xs space-y-1">
              <div className="text-gray-600 font-mono tracking-widest overflow-hidden">
                --------------------------------------------------
              </div>
              <p className="text-gray-400 leading-normal">
                <span className="text-fuchsia-400 font-semibold">PS:</span> Este painel não existe oficialmente. Se descobriste o Easter Egg ou leste isto até ao fim... bem-vindo ao clube.
                <span className="inline-block w-1.5 h-3 bg-cyan-400 animate-pulse ml-1 align-middle" />
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

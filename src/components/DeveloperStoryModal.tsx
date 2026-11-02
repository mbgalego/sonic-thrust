/**
 * Sonic Thrust - Developer Story Modal (Secret Link)
 * Opens when the player clicks the author's name in the footer.
 * Tells a little of the game's story and links to the previous
 * game, Gravity Lander. Follows the PauseModal visual language.
 */

import React, { useEffect } from 'react';
import { X, Rocket, Music, ExternalLink, Gamepad2 } from 'lucide-react';

interface DeveloperStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperStoryModal: React.FC<DeveloperStoryModalProps> = ({ isOpen, onClose }) => {
  // ESC closes the modal while it is open
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
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full max-h-[94vh] overflow-y-auto my-auto bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative text-center space-y-1.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar (ESC)"
            className="absolute top-0 right-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
          <h2 className="text-2xl font-black font-orbitron text-white tracking-widest uppercase neon-text-cyan">
            Arquivo Secreto do Dev
          </h2>
          <p className="text-[11px] font-mono text-cyan-400/90 tracking-wide uppercase">
            Nível de acesso: desenvolvedor — desbloqueado por curiosidade
          </p>
        </div>

        {/* Story */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
          <h3 className="font-orbitron text-sm font-bold text-cyan-300 tracking-wider uppercase flex items-center gap-2">
            <Rocket size={15} className="shrink-0" />
            De onde vem o Sonic Thrust
          </h3>
          <p className="font-rajdhani text-sm text-gray-200 leading-relaxed">
            O Sonic Thrust nasceu de uma pergunta simples: <span className="text-white font-semibold">e se a física do voo fosse tão importante quanto a música que a acompanha?</span> Dois propulsores independentes, zero contactos permitidos e um túnel de néon que pulsa ao ritmo da banda sonora — cada corrida é metade prova de reflexos, metade concerto.
          </p>
          <p className="font-rajdhani text-sm text-gray-200 leading-relaxed">
            Todas as faixas originais do jogo são assinadas por <span className="text-white font-semibold">miguelius</span> (o lado musical do mesmo dev), gravadas e misturadas para empurrar a nave ao ritmo certo. E os ovos de Páscoa escondidos no túnel? Estão lá desde o início — procura bem.
          </p>
        </div>

        {/* Previous game: Gravity Lander */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-fuchsia-500/25 space-y-3">
          <h3 className="font-orbitron text-sm font-bold text-fuchsia-400 tracking-wider uppercase flex items-center gap-2">
            <Gamepad2 size={15} className="shrink-0" />
            O jogo anterior — Gravity Lander
          </h3>
          <p className="font-rajdhani text-sm text-gray-200 leading-relaxed">
            Antes de rasgar o espaço a dois propulsores, havia gravidade. O <span className="text-white font-semibold">Gravity Lander</span> é o meu jogo anterior: física de pouso suave, propulsão nervosa e a mesma obsessão por controles que pesam na mão.
          </p>
          <a
            href="https://gravity-lander.ai.studio/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 w-full px-4 py-2.5 rounded-lg bg-fuchsia-600/20 border border-fuchsia-400/50 hover:bg-fuchsia-500/30 text-fuchsia-300 hover:text-fuchsia-200 font-orbitron text-xs font-bold tracking-widest uppercase transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Rocket size={14} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              Jogar Gravity Lander
            </span>
            <ExternalLink size={14} className="shrink-0" />
          </a>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-gray-500 pt-1">
          <Music size={12} />
          <span>PS: este painel é segredo — não digas a ninguém que encontraste o caminho.</span>
        </div>
      </div>
    </div>
  );
};

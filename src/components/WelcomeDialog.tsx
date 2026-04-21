import welcomeImg from "@/assets/welcome.gif";

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function WelcomeDialog({ open, onClose }: WelcomeDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-dialog-title">
      <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in border border-border flex flex-col items-center gap-4">
        <img src={welcomeImg} alt="Bienvenido" className="max-w-full rounded-lg" />
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <img src="/icon-192.png" alt="PixCool Art" className="w-6 h-6 rounded-md object-cover" />
          <h2 id="welcome-dialog-title" className="text-base font-semibold leading-none">Arte Bricks 2D</h2>
        </div>
        <div className="text-sm text-muted-foreground">Creado por Jesus Linares</div>
        <a
          href="https://instagram.com/pixcool_ve"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-foreground hover:text-primary transition-colors"
        >
          @pixcool_ve
        </a>
        <button
          autoFocus
          onClick={onClose}
          className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
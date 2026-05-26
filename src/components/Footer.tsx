const Footer = () => {
  return (
    <footer className="border-t border-[hsl(var(--glass-border)/0.06)] py-10">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-bold text-xs">MR</span>
          </div>
          <span className="text-foreground font-semibold text-sm">Motorverse Recon</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Product</a>
          <a href="#" className="hover:text-foreground transition-colors">Security</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </div>

        <p className="text-muted-foreground text-xs">© 2026 Motorverse Recon</p>
      </div>
    </footer>
  );
};

export default Footer;

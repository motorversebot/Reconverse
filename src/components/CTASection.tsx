import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-[hsl(var(--glass-border)/0.08)] bg-[hsl(224_45%_8%)] p-12 sm:p-16">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-accent/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Limited Q3 Onboarding</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-white mb-4">
                Built for dealerships
                <br />
                that <span className="text-primary">move fast.</span>
              </h2>
              <p className="text-white/60 text-base sm:text-lg max-w-lg leading-relaxed">
                Join the early access program and rebuild your recon process around real-time data — not whiteboards.
              </p>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-3">
              <Button variant="hero" size="lg" className="text-sm px-8 py-6 rounded-xl w-full">
                Request Early Access
                <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="text-sm px-8 py-6 rounded-xl w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                Book a Demo
              </Button>
              <p className="text-[11px] text-white/40 text-center mt-2 font-mono">No credit card · 14-day pilot · Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

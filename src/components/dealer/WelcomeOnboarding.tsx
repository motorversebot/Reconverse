import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Users, ClipboardList, Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WelcomeOnboardingProps {
  shopName: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Car,
    title: "Add your first unit",
    description: "Enter a VIN or manually add a vehicle to start tracking its recon journey.",
    action: "Add Unit",
    route: "/dealer/units",
  },
  {
    icon: Users,
    title: "Invite your team",
    description: "Add technicians, managers, and staff so everyone stays in sync.",
    action: "Manage Users",
    route: "/dealer/users",
  },
  {
    icon: ClipboardList,
    title: "Customize your pipeline",
    description: "Configure inspection checklists, estimate defaults, and stage thresholds.",
    action: "Settings",
    route: "/dealer/settings",
  },
];

export default function WelcomeOnboarding({ shopName, onDismiss }: WelcomeOnboardingProps) {
  const navigate = useNavigate();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <div className="glass-panel-strong relative overflow-hidden border-primary/20">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        aria-label="Dismiss welcome"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2 pr-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold tracking-[0.1em] uppercase text-primary">
              Welcome
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {shopName} is ready to go
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg">
            Your recon command center is set up. Here are a few things to get started — you can always come back to these later.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <button
              key={i}
              onClick={() => {
                onDismiss();
                navigate(step.route);
              }}
              onMouseEnter={() => setHoveredStep(i)}
              onMouseLeave={() => setHoveredStep(null)}
              className={cn(
                "group glass-panel p-5 text-left transition-all duration-300 space-y-3",
                "hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-xl transition-colors duration-300",
                  hoveredStep === i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/30 text-muted-foreground"
                )}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground/30 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary/60 group-hover:text-primary transition-colors">
                {step.action}
                <ArrowRight className={cn(
                  "h-3 w-3 transition-transform duration-300",
                  hoveredStep === i ? "translate-x-1" : ""
                )} />
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-muted-foreground/40">
            You can revisit these steps anytime from Settings.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}

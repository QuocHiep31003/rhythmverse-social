import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, Info, Sparkles, TriangleAlert, XOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();

  const appearance = {
    default: {
      icon: <Sparkles className="h-5 w-5" />,
      wrapper: "bg-white/5 border-white/15 text-white",
      bar: "bg-white/70",
    },
    success: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      wrapper: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
      bar: "bg-emerald-300",
    },
    info: {
      icon: <Info className="h-5 w-5" />,
      wrapper: "bg-sky-500/15 border-sky-400/40 text-sky-100",
      bar: "bg-sky-300",
    },
    warning: {
      icon: <TriangleAlert className="h-5 w-5" />,
      wrapper: "bg-amber-500/15 border-amber-400/40 text-amber-100",
      bar: "bg-amber-300",
    },
    destructive: {
      icon: <XOctagon className="h-5 w-5" />,
      wrapper: "bg-rose-600/20 border-rose-500/40 text-rose-100",
      bar: "bg-rose-300",
    },
  } as const;

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = (props.variant as keyof typeof appearance) ?? "default";
        const styles = appearance[variant] ?? appearance.default;

        return (
          <Toast key={id} {...props} className="p-0">
            <div className="flex w-full items-start gap-4 px-5 py-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl border text-base shadow-inner",
                  styles.wrapper,
                )}
              >
                {styles.icon}
              </div>

              <div className="flex-1 space-y-1">
                {title && <ToastTitle className="text-base font-semibold tracking-tight">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-sm text-white/80">{description}</ToastDescription>
                )}
                {action && <div className="pt-2 text-sm text-white/70">{action}</div>}
              </div>
            </div>

            <span className={cn("absolute inset-x-5 bottom-2 h-1 rounded-full opacity-80", styles.bar)} />
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

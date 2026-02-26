import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle, X } from "lucide-react";

interface PageErrorModalProps {
  /** Whether the modal is currently shown. */
  isOpen: boolean;
  /** Call this to close the modal (e.g. user dismissed). */
  onClose: () => void;
  /** Bold title line. */
  title?: string;
  /** Detailed description displayed below the title. */
  message: string;
  /**
   * When true (default), a 3-second countdown auto-redirects to /products
   * after the modal opens. Set to false to require manual dismissal.
   */
  autoRedirect?: boolean;
  /** Visual style of the modal. Defaults to "error" (red). Use "success" for green. */
  variant?: "error" | "success";
}

export function PageErrorModal({
  isOpen,
  onClose,
  title = "Something went wrong",
  message,
  autoRedirect = true,
  variant = "error",
}: PageErrorModalProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset countdown whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setCountdown(3);

    if (!autoRedirect) return;

    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          navigate("/products");
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current!);
  }, [isOpen, autoRedirect, navigate]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative mx-4 w-full max-w-sm rounded-md border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        {variant === "success" ? (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
        ) : (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        )}

        {/* Content */}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between gap-3">
          {autoRedirect && (
            <p className="text-xs text-muted-foreground">
              Redirecting in{" "}
              <span className="tabular-nums text-foreground font-medium">
                {countdown}
              </span>
              s…
            </p>
          )}
          <button
            onClick={() => navigate("/products")}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#2E3330] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3a3f3c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Catalogue
          </button>
        </div>
      </div>
    </div>
  );
}

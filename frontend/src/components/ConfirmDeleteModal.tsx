import { Loader2, AlertTriangle, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isConfirming?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isConfirming = false,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={isConfirming ? undefined : onClose}
      />
      
      {/* Modal Container */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
        <div className="relative flex w-full flex-col overflow-hidden rounded-lg border bg-background text-left align-middle shadow-xl transition-all">
          <button
            title="Close modal"
            aria-label="Close modal"
            onClick={onClose}
            disabled={isConfirming}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col-reverse justify-end gap-2 bg-muted/40 p-4 sm:flex-row sm:items-center">
            <button
              onClick={onClose}
              disabled={isConfirming}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isConfirming ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

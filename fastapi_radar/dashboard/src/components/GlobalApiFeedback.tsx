import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiMonitor, ApiErrorEvent } from "@/api/monitor";
import { useT } from "@/i18n";

const ERROR_QUEUE_LIMIT = 8;

export function GlobalApiFeedback() {
  const t = useT();
  const [showSpinner, setShowSpinner] = useState(false);
  const [errors, setErrors] = useState<ApiErrorEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    const unsubscribe = apiMonitor.subscribe((active) => {
      activeRef.current = active;
      setShowSpinner(active);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = apiMonitor.subscribeErrors((event) => {
      setErrors((prev) => {
        const next = [...prev, event];
        return next.slice(-ERROR_QUEUE_LIMIT);
      });
      setDialogOpen(true);
    });
    return unsubscribe;
  }, []);

  const lastError = errors.length > 0 ? errors[errors.length - 1] : null;

  return (
    <>
      {showSpinner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto">
          <div className="relative flex items-center gap-2 rounded-full border bg-background/90 px-4 py-2 shadow-md">
            <div className="absolute -inset-5 rounded-full bg-foreground/15 blur-lg animate-pulse -z-10" />
            <Loader2 className="h-4 w-4 animate-spin text-foreground" />
            <span className="text-xs font-medium text-foreground">
              {t("apiFeedback.loading")}
            </span>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("apiFeedback.errorTitle")}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              {lastError && (
                <>
                  <p className="text-sm text-foreground break-all">
                    {lastError.message}
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    {t("apiFeedback.requestPath")}: {lastError.endpoint}
                  </p>
                </>
              )}
              {errors.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {t("apiFeedback.moreErrors")}
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
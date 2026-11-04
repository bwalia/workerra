"use client";

import { useState, useTransition } from "react";
import { BUTTON_SECONDARY } from "@/shared/ui";
import { setJobStatus } from "../actions";
import type { AtsJobStatus } from "../opsapi-types";

/** Close a live job, or reopen a closed or paused one. */
export function JobStatusControls({ jobId, status }: { jobId: string; status: AtsJobStatus }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const change = (next: AtsJobStatus, confirmText?: string) => () => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const result = await setJobStatus(jobId, next);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {status === "open" ? (
          <>
            <button type="button" disabled={pending} onClick={change("paused")} className={BUTTON_SECONDARY}>
              Pause applications
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={change("closed", "Close this job? It comes off Workerra and stops taking applications.")}
              className={BUTTON_SECONDARY}
            >
              Close job
            </button>
          </>
        ) : status !== "draft" ? (
          <button type="button" disabled={pending} onClick={change("open")} className={BUTTON_SECONDARY}>
            Reopen job
          </button>
        ) : null}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

import React from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  isLoading = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        {description && (
          <div className="flex items-start gap-3 text-sm text-stone-300">
            {isDanger && (
              <div className="rounded-full bg-rose-950/60 p-2 text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <p className="leading-relaxed">{description}</p>
          </div>
        )}

        <div className="mt-2 flex items-center justify-end gap-3 pt-3 border-t border-soc-border/60">
          <Button variant="secondary" size="md" disabled={isLoading} onClick={onClose}>
            {cancelText}
          </Button>

          <Button
            variant={isDanger ? "danger" : "primary"}
            size="md"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

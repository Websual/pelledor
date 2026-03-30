"use client";

import { AlertTriangle, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter, Button } from "@/components/ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${variant === "destructive" ? "bg-red-100" : "bg-sauge/10"}`}>
              <AlertTriangle
                className={`h-5 w-5 ${variant === "destructive" ? "text-red-600" : "text-sauge"}`}
              />
            </div>
            <div className="flex-1">
              <CardTitle>{title}</CardTitle>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-[#f7f7f7] rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 text-anthracite/70" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base text-anthracite">{message}</CardDescription>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {confirmText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


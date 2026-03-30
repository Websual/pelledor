"use client";

import { X } from "lucide-react";
import { ChatThread } from "./chat-thread";
import { Button } from "@/components/ui";

interface ChatDrawerProps {
  appointmentId: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDrawer({ appointmentId, patientName, isOpen, onClose }: ChatDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sable flex-shrink-0">
          <div>
            <h3 className="font-semibold text-anthracite">Messagerie</h3>
            <p className="text-sm text-anthracite/60">{patientName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Chat Content - Takes remaining space */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full">
            <ChatThread appointmentId={appointmentId} />
          </div>
        </div>
      </div>
    </>
  );
}


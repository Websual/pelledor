import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Subscriber = {
  appointmentId: string;
  send: (data: string) => void;
};

const subscribers = new Set<Subscriber>();
const typingState = new Map<string, { userId: string; expiresAt: number }>(); // key: appointmentId

function broadcast(appointmentId: string, event: string, payload: any) {
  const data = `event: ${event}\ndata: ${JSON.stringify({ appointmentId, ...payload })}\n\n`;
  const toRemove: Subscriber[] = [];
  subscribers.forEach((sub) => {
    if (sub.appointmentId === appointmentId) {
      try {
        sub.send(data);
      } catch (error: any) {
        // If send fails, mark subscriber for removal
        if (error.code === 'ERR_INVALID_STATE' || error.message?.includes('closed')) {
          toRemove.push(sub);
        }
      }
    }
  });
  // Remove failed subscribers
  toRemove.forEach((sub) => subscribers.delete(sub));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await prisma.appointments.findFirst({
    where: { id },
    include: {
      practitioners: { select: { user_id: true } },
    },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const isClient = session.user.role === "CLIENT" && appointment.user_id === session.user.id;
  const isPractitioner =
    session.user.role === "PRACTITIONER" &&
    appointment.practitioners?.user_id === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isClient && !isPractitioner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

      const send = (data: string) => {
        try {
          if (!isClosed) {
            controller.enqueue(encoder.encode(data));
          }
        } catch (error: any) {
          // Controller is closed or errored
          if (error.code === 'ERR_INVALID_STATE' || error.message?.includes('closed')) {
            isClosed = true;
            cleanup();
          }
        }
      };

      const subscriber: Subscriber = { appointmentId: id, send };
      subscribers.add(subscriber);

      // Send a welcome ping
      send(`event: ping\ndata: {"ok":true}\n\n`);

      const interval = setInterval(() => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }
        try {
          // Clean typing state expirations (5s TTL)
          const state = typingState.get(id);
          if (state && state.expiresAt < Date.now()) {
            typingState.delete(id);
            broadcast(id, "typing", { typing: false, userId: state.userId });
          }
          // Keep-alive
          send(`event: ping\ndata: {"ts":${Date.now()}}\n\n`);
        } catch (error) {
          // If send fails, stop the interval
          clearInterval(interval);
          isClosed = true;
          cleanup();
        }
      }, 15000);

      const cleanup = () => {
        if (!isClosed) {
          isClosed = true;
        }
        clearInterval(interval);
        subscribers.delete(subscriber);
      };

      // Return cleanup function
      return cleanup;
    },
    cancel() {
      // Cleanup when stream is cancelled
      subscribers.forEach((sub) => {
        if (sub.appointmentId === id) {
          subscribers.delete(sub);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Small helper used by typing route
export function setTyping(appointmentId: string, userId: string, isTyping: boolean) {
  if (isTyping) {
    typingState.set(appointmentId, { userId, expiresAt: Date.now() + 5000 });
  } else {
    typingState.delete(appointmentId);
  }
  broadcast(appointmentId, "typing", { typing: isTyping, userId });
}



import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setTyping } from "../stream/route";


import { z } from "zod";


const typingSchema = z.object({
  typing: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { typing } = typingSchema.parse(body);

  // Verify access to appointment
  const appointment = await prisma.appointments.findFirst({
    where: { id },
    include: {
      practitioners: {
        select: {
          user_id: true,
        },
      },
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

  // Update in-memory typing state and notify subscribers
  setTyping(id, session.user.id, typing);

  return NextResponse.json({ ok: true });
}



import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: session.user.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 50, // Limiter à 50 notifications récentes
    });

    // /api/notifications = page pro → corriger les liens MESSAGE_RECEIVED vers /pro/messages
    const messagesBasePath = "/pro/messages";
    const transformed = notifications.map((n) => {
      let link = n.link;
      if (n.type === "MESSAGE_RECEIVED") {
        const metadata = n.metadata as { senderId?: string } | null;
        const senderId = metadata?.senderId;
        link = senderId
          ? `${messagesBasePath}?chat=${encodeURIComponent(senderId)}`
          : messagesBasePath;
      }
      return { ...n, link };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type, title, message, link, metadata } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        type: type as any,
        title,
        message,
        link: link || null,
        metadata: metadata || null,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}


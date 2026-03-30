import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Récupérer les notifications de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const context = searchParams.get("context") || "account"; // account | pro

    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: session.user.id,
        ...(unreadOnly && { read: false }),
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });

    // Transformer les données pour correspondre à l'interface frontend
    // context=account (défaut) → /account/messages, context=pro → /pro/messages
    const messagesBasePath = context === "pro" ? "/pro/messages" : "/account/messages";
    const transformedNotifications = notifications.map((notification) => {
      let link = notification.link;
      // Corriger les liens MESSAGE_RECEIVED selon le contexte (account = /account/messages)
      if (notification.type === "MESSAGE_RECEIVED") {
        const metadata = notification.metadata as { senderId?: string } | null;
        const senderId = metadata?.senderId;
        link = senderId
          ? `${messagesBasePath}?chat=${encodeURIComponent(senderId)}`
          : messagesBasePath;
      }
      return {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link,
        read: notification.read,
        createdAt: notification.created_at.toISOString(),
      };
    });

    return NextResponse.json(transformedNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH: Marquer une notification comme lue
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, read } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        user_id: session.user.id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const updatedNotification = await prisma.notifications.update({
      where: { id: notificationId },
      data: {
        read: read !== undefined ? read : true,
      },
    });

    return NextResponse.json({
      id: updatedNotification.id,
      read: updatedNotification.read,
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

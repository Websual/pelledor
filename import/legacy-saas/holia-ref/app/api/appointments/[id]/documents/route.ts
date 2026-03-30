import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import { promises as fs } from "fs";
import path from "path";




// GET - Récupérer les documents d'un RDV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier les permissions
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        practitioners: {
          select: {
            user_id: true,
          },
        },
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const isPractitioner = session.user.role === "PRACTITIONER" && appointment.practitioners.user_id === session.user.id;
    const isClient = session.user.role === "CLIENT" && appointment.users.id === session.user.id;

    if (!isPractitioner && !isClient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer les documents
    const documents = await prisma.client_documents.findMany({
      where: { appointment_id: id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST - Uploader un document (praticien uniquement)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Vérifier que c'est le praticien du RDV
    const appointment = await prisma.appointments.findFirst({
      where: { id },
      include: {
        practitioners: {
          select: {
            id: true,
            user_id: true,
          },
        },
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (session.user.role !== "PRACTITIONER" || appointment.practitioners.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Uploader le fichier dans /public/uploads/documents/
    const baseUploadsDir = "/var/www/holia-assets/public/uploads/documents";
    const fileName = `${createId()}-${file.name}`;
    const filePath = path.join(baseUploadsDir, fileName);
    const fileUrl = `/uploads/documents/${fileName}`;
    
    // Créer le dossier s'il n'existe pas
    await fs.mkdir(baseUploadsDir, { recursive: true });
    
    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    // Créer le document en BDD
    const document = await prisma.client_documents.create({
      data: {
        id: createId(),
        appointment_id: id,
        user_id: appointment.users.id,
        practitioner_id: appointment.practitioners.id,
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        description: description || null,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}


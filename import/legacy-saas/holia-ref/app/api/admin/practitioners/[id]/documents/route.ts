import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const documentTypeSchema = z.enum(["diploma", "kbis", "rcp"]);
const actionSchema = z.enum(["approve", "reject"]);

const approveDocumentSchema = z.object({
  type: documentTypeSchema,
  action: z.literal("approve"),
});

const rejectDocumentSchema = z.object({
  type: documentTypeSchema,
  action: z.literal("reject"),
  reason: z.string().min(1, "Le motif de refus est requis"),
});

// PATCH: Valider ou rejeter un document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practitionerId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    let schema;
    if (action === "approve") {
      schema = approveDocumentSchema;
    } else {
      schema = rejectDocumentSchema;
    }

    const validated = schema.parse(body);
    const { type } = validated;

    // Vérifier que le praticien existe
    const practitioner = await prisma.practitioners.findUnique({
      where: { id: practitionerId },
      include: {
        users: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Vérifier que le document existe
    const documentFieldMap = {
      diploma: "diploma_document_url",
      kbis: "kbis_document_url",
      rcp: "rcp_document_url",
    };

    const documentUrlField = documentFieldMap[type];
    const documentUrl = practitioner[documentUrlField as keyof typeof practitioner] as string | null;

    if (!documentUrl) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (action === "approve") {
      // Approuver le document
      if (type === "diploma") {
        updateData.diploma_verified = true;
      } else if (type === "kbis") {
        updateData.kbis_verified = true;
      } else if (type === "rcp") {
        updateData.rcp_verified = true;
        updateData.has_rcp_insurance = true; // Selon la demande utilisateur
      }
    } else {
      // Rejeter le document
      const { reason } = validated as z.infer<typeof rejectDocumentSchema>;
      
      if (type === "diploma") {
        updateData.diploma_verified = false;
        // Optionnel : on pourrait aussi supprimer le document ou le marquer comme rejeté
      } else if (type === "kbis") {
        updateData.kbis_verified = false;
      } else if (type === "rcp") {
        updateData.rcp_verified = false;
        updateData.has_rcp_insurance = false;
      }

      // TODO: Envoyer une notification au praticien avec le motif
      // Pour l'instant, on pourrait logger ou créer une entrée dans une table de notifications
      console.log(`Document ${type} rejeté pour praticien ${practitionerId}. Motif: ${reason}`);
      
      // Ici, vous pourriez ajouter une logique pour envoyer un email ou créer une notification
      // Exemple avec une table de notifications (si elle existe) :
      // await prisma.notifications.create({
      //   data: {
      //     user_id: practitioner.user_id,
      //     type: 'document_rejected',
      //     title: `Document ${type} rejeté`,
      //     message: `Votre document ${type} a été rejeté. Motif: ${reason}`,
      //   },
      // });
    }

    // Mettre à jour le praticien
    const updatedPractitioner = await prisma.practitioners.update({
      where: { id: practitionerId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      practitioner: {
        id: updatedPractitioner.id,
        diplomaVerified: updatedPractitioner.diploma_verified,
        kbisVerified: updatedPractitioner.kbis_verified,
        rcpVerified: updatedPractitioner.rcp_verified,
        hasRcpInsurance: updatedPractitioner.has_rcp_insurance,
      },
    });
  } catch (error) {
    console.error("Error updating document status:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update document status" },
      { status: 500 }
    );
  }
}

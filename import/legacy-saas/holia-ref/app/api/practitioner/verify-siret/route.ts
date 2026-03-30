import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schéma de validation pour la requête
const verifySiretSchema = z.object({
  siret: z.string().regex(/^\d{14}$/, "Le SIRET doit contenir exactement 14 chiffres"),
});

interface INSEEUniteLegale {
  denominationUniteLegale?: string | null;
  prenom1UniteLegale?: string | null;
  prenom2UniteLegale?: string | null;
  prenom3UniteLegale?: string | null;
  prenom4UniteLegale?: string | null;
  nomUniteLegale?: string | null;
  etatAdministratifUniteLegale: string;
  activitePrincipaleUniteLegale?: string | null;
}

interface INSEEEtablissement {
  uniteLegale: INSEEUniteLegale;
  activitePrincipaleEtablissement?: string | null;
  activitePrincipaleNAF25Etablissement?: string | null;
  adresseEtablissement?: {
    numeroVoieEtablissement?: string | null;
    typeVoieEtablissement?: string | null;
    libelleVoieEtablissement?: string | null;
    codePostalEtablissement?: string | null;
    libelleCommuneEtablissement?: string | null;
  } | null;
}

interface INSEEResponse {
  header: {
    statut: number;
    message: string;
  };
  etablissement: INSEEEtablissement;
}

// POST: Vérifier un SIRET via l'API INSEE
export async function POST(request: NextRequest) {
  try {
    // Vérifier la session utilisateur
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est un praticien
    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json(
        { error: "Forbidden. Only practitioners can verify their SIRET." },
        { status: 403 }
      );
    }

    // Vérifier que la clé API INSEE est configurée
    if (!process.env.INSEE_API_KEY) {
      console.error("INSEE_API_KEY is not configured");
      return NextResponse.json(
        { error: "Service de vérification non disponible" },
        { status: 500 }
      );
    }

    // Parser et valider le body
    const body = await request.json();
    const validatedData = verifySiretSchema.parse(body);
    const siret = validatedData.siret;

    // Récupérer le praticien connecté
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
    });

    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 }
      );
    }

    // Appeler l'API INSEE
    const inseeUrl = `https://api.insee.fr/api-sirene/3.11/siret/${siret}`;
    
    console.log(`[SIRET Verification] Calling INSEE API for SIRET: ${siret}`);
    console.log(`[SIRET Verification] URL: ${inseeUrl}`);
    
    let inseeResponse: Response;
    try {
      inseeResponse = await fetch(inseeUrl, {
        method: "GET",
        headers: {
          "X-INSEE-Api-Key-Integration": process.env.INSEE_API_KEY || "",
          "Accept": "application/json",
        },
      });
      
      console.log(`[SIRET Verification] Response status: ${inseeResponse.status}`);
      console.log(`[SIRET Verification] Response ok: ${inseeResponse.ok}`);
    } catch (fetchError) {
      console.error("[SIRET Verification] Error calling INSEE API:", fetchError);
      return NextResponse.json(
        { error: "Erreur lors de l'appel à l'API INSEE" },
        { status: 500 }
      );
    }

    // Vérifier le statut de la réponse
    if (!inseeResponse.ok) {
      const errorText = await inseeResponse.text();
      console.error(`[SIRET Verification] INSEE API error - Status: ${inseeResponse.status}, Body:`, errorText);
      
      if (inseeResponse.status === 404) {
        // L'API INSEE peut retourner 404 même si le SIRET existe mais avec une erreur dans le body
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.header?.message) {
            return NextResponse.json(
              { error: `SIRET introuvable: ${errorJson.header.message}` },
              { status: 404 }
            );
          }
        } catch {
          // Pas de JSON, utiliser le message par défaut
        }
        return NextResponse.json(
          { error: "SIRET introuvable" },
          { status: 404 }
        );
      }
      if (inseeResponse.status === 401 || inseeResponse.status === 403) {
        console.error("[SIRET Verification] INSEE API authentication failed:", {
          status: inseeResponse.status,
          body: errorText,
          hasApiKey: !!process.env.INSEE_API_KEY,
        });
        
        // Essayer de parser le message d'erreur
        let errorMessage = "Erreur d'authentification avec l'API INSEE";
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = `Erreur d'authentification: ${errorJson.message}`;
          }
        } catch {
          // Utiliser le message par défaut
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `Erreur lors de la vérification du SIRET (${inseeResponse.status})` },
        { status: 500 }
      );
    }

    // Parser la réponse INSEE
    let inseeData: INSEEResponse;
    try {
      const responseText = await inseeResponse.text();
      console.log(`[SIRET Verification] INSEE API response body:`, responseText.substring(0, 500)); // Log les 500 premiers caractères
      
      inseeData = JSON.parse(responseText);
      console.log(`[SIRET Verification] Parsed INSEE data structure:`, {
        hasEtablissement: !!inseeData.etablissement,
        hasUniteLegale: !!inseeData.etablissement?.uniteLegale,
        headerStatut: inseeData.header?.statut,
        headerMessage: inseeData.header?.message,
      });
    } catch (parseError) {
      console.error("[SIRET Verification] Error parsing INSEE response:", parseError);
      return NextResponse.json(
        { error: "Erreur lors du traitement de la réponse INSEE" },
        { status: 500 }
      );
    }

    // Vérifier la structure de la réponse et le statut dans le header
    // Le statut peut être 200 (ok) ou un autre code d'erreur
    if (inseeData.header?.statut !== 200 && inseeData.header?.statut !== 0) {
      console.error(`[SIRET Verification] INSEE API returned error status: ${inseeData.header?.statut}, message: ${inseeData.header?.message}`);
      return NextResponse.json(
        { error: inseeData.header?.message || "Erreur lors de la vérification du SIRET" },
        { status: 400 }
      );
    }

    if (!inseeData.etablissement || !inseeData.etablissement.uniteLegale) {
      console.error("[SIRET Verification] Invalid INSEE response structure:", JSON.stringify(inseeData, null, 2));
      return NextResponse.json(
        { error: "Réponse INSEE invalide" },
        { status: 500 }
      );
    }

    const uniteLegale = inseeData.etablissement.uniteLegale;

    // Vérifier l'état administratif (doit être 'A' pour Actif)
    if (uniteLegale.etatAdministratifUniteLegale !== "A") {
      return NextResponse.json(
        { 
          error: "Entreprise inactive ou inexistante",
          details: `L'état administratif est '${uniteLegale.etatAdministratifUniteLegale}' (attendu: 'A' pour Actif)`
        },
        { status: 400 }
      );
    }

    // Extraire le nom officiel
    let officialName: string | null = null;
    
    // Pour les personnes morales
    if (uniteLegale.denominationUniteLegale) {
      officialName = uniteLegale.denominationUniteLegale;
    } 
    // Pour les personnes physiques
    else if (uniteLegale.nomUniteLegale) {
      const prenoms = [
        uniteLegale.prenom1UniteLegale,
        uniteLegale.prenom2UniteLegale,
        uniteLegale.prenom3UniteLegale,
        uniteLegale.prenom4UniteLegale,
      ]
        .filter(Boolean)
        .join(" ");
      
      officialName = prenoms 
        ? `${prenoms} ${uniteLegale.nomUniteLegale}`.trim()
        : uniteLegale.nomUniteLegale;
    }

    // Extraire le code APE (priorité à l'établissement, sinon unité légale)
    const apeCode = inseeData.etablissement.activitePrincipaleNAF25Etablissement || 
                    inseeData.etablissement.activitePrincipaleEtablissement || 
                    uniteLegale.activitePrincipaleUniteLegale || 
                    null;

    // Extraire l'adresse de l'établissement (nouvelle structure avec adresseEtablissement)
    const etablissement = inseeData.etablissement;
    const adresse = etablissement.adresseEtablissement;
    let inseeAddress: string | null = null;
    let inseeCity: string | null = null;
    
    if (adresse) {
      const parts: string[] = [];
      if (adresse.numeroVoieEtablissement) {
        parts.push(adresse.numeroVoieEtablissement);
      }
      if (adresse.typeVoieEtablissement) {
        parts.push(adresse.typeVoieEtablissement);
      }
      if (adresse.libelleVoieEtablissement) {
        parts.push(adresse.libelleVoieEtablissement);
      }
      if (adresse.codePostalEtablissement) {
        parts.push(adresse.codePostalEtablissement);
      }
      if (adresse.libelleCommuneEtablissement) {
        inseeCity = adresse.libelleCommuneEtablissement;
        parts.push(adresse.libelleCommuneEtablissement);
      }
      inseeAddress = parts.join(" ").trim() || null;
    }

    // Mettre à jour le praticien en base de données
    const updatedPractitioner = await prisma.practitioners.update({
      where: { id: practitioner.id },
      data: {
        siret: siret,
        is_verified: true,
        official_name: officialName,
        ape_code: apeCode,
        updated_at: new Date(),
      } as any, // Type assertion nécessaire car Prisma Client peut ne pas avoir été régénéré
    });

    return NextResponse.json({
      success: true,
      message: "SIRET vérifié avec succès",
      data: {
        siret: updatedPractitioner.siret,
        officialName: (updatedPractitioner as any)?.official_name || null,
        apeCode: (updatedPractitioner as any)?.ape_code || null,
        isVerified: updatedPractitioner.is_verified,
        address: inseeAddress,
        city: inseeCity,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error verifying SIRET:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification du SIRET" },
      { status: 500 }
    );
  }
}

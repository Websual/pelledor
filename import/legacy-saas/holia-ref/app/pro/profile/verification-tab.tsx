"use client";

import { useState, useRef } from "react";
import { Button, Card, CardContent, Label } from "@/components/ui";
import { Upload, FileText, CheckCircle, Clock, XCircle, X, GraduationCap, Building2, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";

interface PractitionerProfile {
  id: string;
  siret: string | null;
  verificationDocumentUrl: string | null;
  diplomaDocumentUrl: string | null;
  diplomaVerified: boolean;
  kbisDocumentUrl: string | null;
  kbisVerified: boolean;
  rcpDocumentUrl: string | null;
  rcpVerified: boolean;
  isVerified: boolean;
}

interface VerificationTabProps {
  profile: PractitionerProfile;
  onToast: (message: string, type: "success" | "error" | "loading") => void;
}

type DocumentType = "diploma" | "kbis" | "rcp";

interface DocumentConfig {
  type: DocumentType;
  label: string;
  description: string;
  icon: typeof GraduationCap;
  urlField: keyof PractitionerProfile;
  verifiedField: keyof PractitionerProfile;
}

const DOCUMENT_CONFIGS: DocumentConfig[] = [
  {
    type: "diploma",
    label: "Diplôme ou Certification",
    description: "Diplôme professionnel ou certificat de formation",
    icon: GraduationCap,
    urlField: "diplomaDocumentUrl",
    verifiedField: "diplomaVerified",
  },
  {
    type: "kbis",
    label: "Extrait Kbis ou Avis de situation INSEE",
    description: "Document officiel justifiant votre activité professionnelle",
    icon: Building2,
    urlField: "kbisDocumentUrl",
    verifiedField: "kbisVerified",
  },
  {
    type: "rcp",
    label: "Attestation d'assurance RC Pro",
    description: "Document attestant de votre assurance responsabilité civile professionnelle",
    icon: Shield,
    urlField: "rcpDocumentUrl",
    verifiedField: "rcpVerified",
  },
];

export function VerificationTab({ profile, onToast }: VerificationTabProps) {
  const queryClient = useQueryClient();
  const fileInputRefs = {
    diploma: useRef<HTMLInputElement>(null),
    kbis: useRef<HTMLInputElement>(null),
    rcp: useRef<HTMLInputElement>(null),
  };
  const [uploading, setUploading] = useState<Record<DocumentType, boolean>>({
    diploma: false,
    kbis: false,
    rcp: false,
  });

  // Déterminer le statut d'un document
  const getDocumentStatus = (config: DocumentConfig) => {
    const url = profile[config.urlField] as string | null;
    const verified = profile[config.verifiedField] as boolean;

    if (!url) {
      return {
        label: "Non fourni",
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: XCircle,
      };
    }

    if (verified) {
      return {
        label: "Validé",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      };
    }

    return {
      label: "En attente",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: DocumentType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      onToast("Type de fichier non autorisé. Seuls les PDF et images sont acceptés.", "error");
      return;
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onToast("Le fichier est trop volumineux. Taille maximum : 10MB.", "error");
      return;
    }

    setUploading((prev) => ({ ...prev, [documentType]: true }));
    onToast(`Upload du ${DOCUMENT_CONFIGS.find((c) => c.type === documentType)?.label.toLowerCase()} en cours...`, "loading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", documentType);

      const res = await fetch("/api/practitioners/verification-document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de l'upload");
      }

      // Rafraîchir les données du profil
      await queryClient.invalidateQueries({ queryKey: ["practitionerProfile"] });
      onToast("Document uploadé avec succès", "success");
    } catch (error) {
      console.error("Error uploading document:", error);
      onToast(
        error instanceof Error ? error.message : "Erreur lors de l'upload du document",
        "error"
      );
    } finally {
      setUploading((prev) => ({ ...prev, [documentType]: false }));
      if (fileInputRefs[documentType].current) {
        fileInputRefs[documentType].current.value = "";
      }
    }
  };

  const handleRemoveDocument = async (documentType: DocumentType, config: DocumentConfig) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce document ?`)) {
      return;
    }

    try {
      const updateData: any = {};
      if (documentType === "diploma") {
        updateData.diplomaDocumentUrl = null;
        updateData.diplomaVerified = false;
      } else if (documentType === "kbis") {
        updateData.kbisDocumentUrl = null;
        updateData.kbisVerified = false;
      } else if (documentType === "rcp") {
        updateData.rcpDocumentUrl = null;
        updateData.rcpVerified = false;
      }

      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      await queryClient.invalidateQueries({ queryKey: ["practitionerProfile"] });
      onToast("Document supprimé avec succès", "success");
    } catch (error) {
      onToast("Erreur lors de la suppression du document", "error");
    }
  };

  const renderDocumentUpload = (config: DocumentConfig) => {
    const documentUrl = profile[config.urlField] as string | null;
    const status = getDocumentStatus(config);
    const StatusIcon = status.icon;
    const Icon = config.icon;
    const isUploading = uploading[config.type];

    return (
      <Card key={config.type} className="bg-white border border-gray-100 rounded-3xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sauge/10 rounded-2xl">
                <Icon className="h-5 w-5 text-sauge" />
              </div>
              <div>
                <h3 className="font-semibold text-anthracite">{config.label}</h3>
                <p className="text-sm text-anthracite/70">{config.description}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </div>
          </div>

          {documentUrl ? (
            <div className="space-y-4">
              <div className="p-4 bg-[#f7f7f7] border border-sable rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-sauge" />
                    <div>
                      <p className="font-medium text-anthracite">Document uploadé</p>
                      <p className="text-xs text-anthracite/60">
                        {documentUrl.split("/").pop()}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveDocument(config.type, config)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
                {documentUrl.match(/\.(jpg|jpeg|png|webp)$/i) && (
                  <div className="mt-4">
                    <Image
                      src={documentUrl}
                      alt={config.label}
                      width={400}
                      height={300}
                      className="rounded-3xl border border-gray-100 max-w-full"
                    />
                  </div>
                )}
                {documentUrl.match(/\.pdf$/i) && (
                  <div className="mt-4">
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sauge hover:underline text-sm flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Voir le document PDF
                    </a>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRefs[config.type].current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Upload en cours..." : "Remplacer le document"}
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-6 text-center">
              <Icon className="h-10 w-10 text-anthracite/40 mx-auto mb-3" />
              <p className="text-sm text-anthracite/70 mb-4">
                Aucun document uploadé
              </p>
              <Button
                type="button"
                onClick={() => fileInputRefs[config.type].current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Upload en cours..." : "Télécharger un document"}
              </Button>
              <p className="text-xs text-anthracite/60 mt-2">
                Formats acceptés : PDF, JPG, PNG, WEBP (max 10MB)
              </p>
            </div>
          )}

          <input
            ref={fileInputRefs[config.type]}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => handleFileUpload(e, config.type)}
            className="hidden"
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statut de vérification global */}
      <div className="flex items-center justify-between p-4 bg-white border-2 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-2xl ${
            profile.isVerified
              ? "bg-green-100 text-green-800 border-green-200"
              : profile.siret
              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }`}>
            {profile.isVerified ? (
              <CheckCircle className="h-5 w-5" />
            ) : profile.siret ? (
              <Clock className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-anthracite">Statut de vérification</h3>
            <p className="text-sm text-anthracite/70">
              {profile.isVerified
                ? "Votre identité professionnelle a été vérifiée"
                : profile.siret
                ? "Votre demande est en cours d'examen par notre équipe"
                : "Complétez les informations ci-dessous pour démarrer la vérification"}
            </p>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full border text-sm font-medium ${
            profile.isVerified
              ? "bg-green-100 text-green-800 border-green-200"
              : profile.siret
              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }`}
        >
          {profile.isVerified ? "Vérifié" : profile.siret ? "En attente" : "Non vérifié"}
        </div>
      </div>

      {/* Informations SIRET */}
      <div>
        <h3 className="text-lg font-semibold text-anthracite mb-4">Numéro SIRET</h3>
        {profile.siret ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-anthracite/70 mb-1">SIRET enregistré</p>
                <p className="font-mono text-lg font-semibold text-anthracite">{profile.siret}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-xs text-anthracite/60 mt-2">
              Vous pouvez modifier votre SIRET dans la section &quot;Identité & Contact&quot;
            </p>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <p className="text-sm text-anthracite/70">
              Aucun numéro SIRET renseigné. Rendez-vous dans la section &quot;Identité & Contact&quot; pour l&apos;ajouter.
            </p>
          </div>
        )}
      </div>

      {/* Documents de vérification */}
      <div>
        <h3 className="text-lg font-semibold text-anthracite mb-4">Documents de vérification</h3>
        <p className="text-sm text-anthracite/70 mb-6">
          Téléchargez les documents justificatifs de votre activité professionnelle. Chaque document sera vérifié par notre équipe.
        </p>
        <div className="space-y-4">
          {DOCUMENT_CONFIGS.map((config) => renderDocumentUpload(config))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Label,
  Skeleton,
} from "@/components/ui";
import {
  Plus,
  Upload,
  Users,
  Euro,
  Calendar,
  MapPin,
  Video,
  Pencil,
  Trash2,
  ExternalLink,
  Ticket,
  X,
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { cancelEvent, confirmAndCaptureEvent, cancelAndReleaseEvent } from "./actions";

interface TicketWithUser {
  id: string;
  status: string;
  quantity: number;
  amount_cents: number | null;
  users: { name: string | null; email: string } | null;
}

interface EventWithStats {
  id: string;
  slug: string;
  title: string;
  status?: string;
  event_type?: string;
  description: string | null;
  banner_url: string | null;
  poster_url: string | null;
  date: string;
  price_cents: number;
  price_visio_cents?: number | null;
  capacity: number;
  remaining_places: number;
  location_type: string;
  address: string | null;
  allow_on_site_payment?: boolean;
  lat?: number | null;
  lng?: number | null;
  level?: string | null;
  material_required?: string | null;
  accessibility?: string | null;
  totalRevenueCents: number;
  totalTicketsSold: number;
  tickets?: TicketWithUser[];
  attendees: { name: string | null; email: string }[];
  min_participants?: number;
  confirmation_status?: string;
  auto_confirm_on_min?: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFERENCE: "Conférence",
  ATELIER: "Atelier",
  STAGE: "Stage",
};

function posterSrc(url: string | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "";
  return `${origin}${url}`;
}

export default function EventsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const posterFileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<"CONFERENCE" | "ATELIER" | "STAGE">("CONFERENCE");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [priceCents, setPriceCents] = useState(0);
  const [priceVisioCents, setPriceVisioCents] = useState<number | null>(null);
  const [capacity, setCapacity] = useState(20);
  const [locationType, setLocationType] = useState<"PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID">("PRESENTIAL_ONLY");
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [level, setLevel] = useState("");
  const [materialRequired, setMaterialRequired] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [allowOnSitePayment, setAllowOnSitePayment] = useState(false);
  const [minParticipants, setMinParticipants] = useState(1);
  const [autoConfirmOnMin, setAutoConfirmOnMin] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [collectingTicketId, setCollectingTicketId] = useState<string | null>(null);
  const [confirmCaptureInProgress, setConfirmCaptureInProgress] = useState(false);
  const [releaseInProgress, setReleaseInProgress] = useState(false);

  const { data: apiData, isLoading } = useQuery<{
    events: EventWithStats[];
    practitionerSubscriptionStatus: string;
  }>({
    queryKey: ["practitionerEvents"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/events");
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  const events = apiData?.events ?? [];
  const practitionerSubscriptionStatus = apiData?.practitionerSubscriptionStatus ?? "free";
  const isPremium = practitionerSubscriptionStatus === "active";

  const createEvent = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/practitioners/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerEvents"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: object }) => {
      const res = await fetch(`/api/practitioners/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerEvents"] });
      setShowForm(false);
      setEditingEventId(null);
      resetForm();
    },
  });

  const handleCancelEvent = async (eventId: string) => {
    setCancelInProgress(true);
    try {
      const result = await cancelEvent(eventId);
      if (!result.success && "error" in result) {
        alert(result.error || "Erreur lors de l'annulation");
      } else if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["practitionerEvents"] });
        setCancelConfirmId(null);
      }
    } finally {
      setCancelInProgress(false);
    }
  };

  const compressImageForPoster = async (file: File, maxSize = 1920): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Impossible de créer le contexte canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Échec de la compression"));
                return;
              }
              const compressed = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".webp"),
                { type: "image/webp", lastModified: Date.now() }
              );
              resolve(compressed);
            },
            "image/webp",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Erreur lors du chargement de l'image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsDataURL(file);
    });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.user) return;
    setUploadingBanner(true);
    try {
      const compressed = await compressImageForPoster(file, 1920);
      const form = new FormData();
      form.append("image", compressed);
      form.append("type", "event_banner");
      const res = await fetch("/api/uploads/practitioner", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.details || "Échec de l'upload");
      }
      const json = await res.json();
      if (json?.url) setBannerUrl(json.url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data?.user) return;
    setUploadingPoster(true);
    try {
      const form = new FormData();
      const isPdf = file.type === "application/pdf";
      if (isPdf) {
        form.append("file", file);
      } else {
        const compressed = await compressImageForPoster(file, 1920);
        form.append("image", compressed);
      }
      form.append("type", "event_poster");
      const res = await fetch("/api/uploads/practitioner", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.details || "Échec de l'upload");
      }
      const json = await res.json();
      if (json?.url) setPosterUrl(json.url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploadingPoster(false);
      if (posterFileInputRef.current) posterFileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setTitle("");
    setEventType("CONFERENCE");
    setDescription("");
    setBannerUrl("");
    setPosterUrl("");
    setDate("");
    setTime("10:00");
    setPriceCents(0);
    setPriceVisioCents(null);
    setCapacity(20);
    setLocationType("PRESENTIAL_ONLY");
    setAddress("");
    setAddressLat(null);
    setAddressLng(null);
    setLevel("");
    setMaterialRequired("");
    setAccessibility("");
    setAllowOnSitePayment(false);
    setMinParticipants(1);
    setAutoConfirmOnMin(false);
    setEditingEventId(null);
  };

  const loadEventForEdit = (event: EventWithStats) => {
    setTitle(event.title);
    setEventType((event.event_type as "CONFERENCE" | "ATELIER" | "STAGE") || "CONFERENCE");
    setDescription(event.description || "");
    setBannerUrl(event.banner_url || "");
    setPosterUrl(event.poster_url || "");
    const d = new Date(event.date);
    setDate(d.toISOString().slice(0, 10));
    setTime(d.toTimeString().slice(0, 5));
    setPriceCents(event.price_cents);
    setPriceVisioCents(event.price_visio_cents ?? null);
    setCapacity(event.capacity);
    setLocationType(event.location_type as any);
    setAddress(event.address || "");
    setAddressLat(event.lat ?? null);
    setAddressLng(event.lng ?? null);
    setLevel(event.level ?? "");
    setMaterialRequired(event.material_required ?? "");
    setAccessibility(event.accessibility ?? "");
    setAllowOnSitePayment(event.allow_on_site_payment ?? false);
    setMinParticipants((event as { min_participants?: number }).min_participants ?? 1);
    setAutoConfirmOnMin((event as { auto_confirm_on_min?: boolean }).auto_confirm_on_min ?? false);
    setEditingEventId(event.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      alert("Titre et date requis");
      return;
    }
    const dateTime = new Date(`${date}T${time}`);
    const payload = {
      title,
      event_type: eventType,
      description: description || undefined,
      banner_url: bannerUrl || undefined,
      poster_url: posterUrl || undefined,
      date: dateTime.toISOString(),
      price_cents: priceCents,
      price_visio_cents: locationType === "HYBRID" ? (priceVisioCents ?? undefined) : undefined,
      capacity,
      location_type: locationType,
      address: address || undefined,
      lat: addressLat ?? undefined,
      lng: addressLng ?? undefined,
      level: level || undefined,
      material_required: materialRequired || undefined,
      accessibility: accessibility || undefined,
      allow_on_site_payment: isPremium && (locationType === "PRESENTIAL_ONLY" || locationType === "HYBRID") ? allowOnSitePayment : undefined,
      min_participants: minParticipants,
      auto_confirm_on_min: minParticipants > 1 ? autoConfirmOnMin : undefined,
    };

    if (editingEventId) {
      updateEvent.mutate({ id: editingEventId, payload });
    } else {
      createEvent.mutate(payload);
    }
  };

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  if (session.status === "loading") return <Skeleton />;

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-anthracite">Événements</h1>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-sauge hover:bg-sauge/90 text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "Annuler" : "Nouvel événement"}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-anthracite mb-6">
              {editingEventId ? "Modifier l'événement" : "Ajouter une conférence / atelier"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Ex: Atelier sophrologie & sommeil"
                  className="rounded-xl border-gray-200"
                />
              </div>

              <div>
                <Label htmlFor="eventType">Type d'événement</Label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="CONFERENCE">Conférence</option>
                  <option value="ATELIER">Atelier</option>
                  <option value="STAGE">Stage</option>
                </select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sauge/30 focus:border-sauge"
                  placeholder="Décrivez votre événement..."
                />
              </div>

              <div>
                <Label>Bannière (hero)</Label>
                <p className="text-xs text-anthracite/60 mb-2">Image paysage pour le bandeau en haut de la page événement.</p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="rounded-xl border-gray-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingBanner ? "Upload en cours..." : "Choisir une bannière"}
                  </Button>
                  {bannerUrl && (
                    <div className="relative w-40 h-20 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
                      <Image
                        src={posterSrc(bannerUrl) || ""}
                        alt="Bannière"
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="160px"
                      />
                      <button
                        type="button"
                        onClick={() => setBannerUrl("")}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-anthracite/60 mt-1">JPG, PNG ou WebP. Format paysage recommandé. Max 10 Mo.</p>
              </div>

              <div>
                <Label>Programme / affiche</Label>
                <p className="text-xs text-anthracite/60 mb-2">Document à télécharger par les participants (image ou PDF).</p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <input
                    ref={posterFileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handlePosterUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => posterFileInputRef.current?.click()}
                    disabled={uploadingPoster}
                    className="rounded-xl border-gray-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingPoster ? "Upload en cours..." : "Choisir une image ou PDF"}
                  </Button>
                  {posterUrl && (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
                      {posterUrl.toLowerCase().endsWith(".pdf") ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-600 text-xs font-medium">
                          PDF
                        </div>
                      ) : (
                        <Image
                          src={posterSrc(posterUrl) || ""}
                          alt="Affiche"
                          fill
                          className="object-cover"
                          unoptimized
                          sizes="96px"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setPosterUrl("")}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-anthracite/60 mt-1">JPG, PNG, WebP ou PDF. Max 10 Mo.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Heure</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="rounded-xl border-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceCents / 100}
                    onChange={(e) =>
                      setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))
                    }
                    className="rounded-xl border-gray-200"
                  />
                </div>
                {locationType === "HYBRID" && (
                  <div>
                    <Label htmlFor="priceVisio">Prix visioconférence (€)</Label>
                    <Input
                      id="priceVisio"
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceVisioCents != null ? priceVisioCents / 100 : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPriceVisioCents(v === "" ? null : Math.round(parseFloat(v || "0") * 100));
                      }}
                      placeholder="Optionnel"
                      className="rounded-xl border-gray-200"
                    />
                    <p className="text-xs text-anthracite/60 mt-1">Prix pour participation en visioconférence</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="capacity">Places</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value || "1", 10))}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <Label htmlFor="minParticipants">Minimum de participants</Label>
                  <Input
                    id="minParticipants"
                    type="number"
                    min="1"
                    value={minParticipants}
                    onChange={(e) => setMinParticipants(Math.max(1, parseInt(e.target.value || "1", 10)))}
                    className="rounded-xl border-gray-200"
                  />
                  <p className="text-xs text-anthracite/60 mt-1">Si non atteint, les paiements restent en attente</p>
                </div>
              </div>

              {minParticipants > 1 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    id="autoConfirmOnMin"
                    checked={autoConfirmOnMin}
                    onChange={(e) => setAutoConfirmOnMin(e.target.checked)}
                    className="rounded text-sauge focus:ring-sauge"
                  />
                  <Label htmlFor="autoConfirmOnMin" className="cursor-pointer font-medium text-anthracite">
                    Confirmation automatique : capturer les paiements dès que le minimum est atteint
                  </Label>
                </div>
              )}

              <div>
                <Label>Lieu</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="location"
                      checked={locationType === "PRESENTIAL_ONLY"}
                      onChange={() => setLocationType("PRESENTIAL_ONLY")}
                      className="text-sauge"
                    />
                    <MapPin className="h-4 w-4 text-anthracite/70" /> Présentiel
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="location"
                      checked={locationType === "VIDEO_ONLY"}
                      onChange={() => setLocationType("VIDEO_ONLY")}
                      className="text-sauge"
                    />
                    <Video className="h-4 w-4 text-anthracite/70" /> Visio
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="location"
                      checked={locationType === "HYBRID"}
                      onChange={() => setLocationType("HYBRID")}
                      className="text-sauge"
                    />
                    Hybride
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="level">Niveau</Label>
                  <select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm mt-2"
                  >
                    <option value="">Non spécifié</option>
                    <option value="DEBUTANT">Débutant</option>
                    <option value="INTERMEDIAIRE">Intermédiaire</option>
                    <option value="AVANCE">Avancé</option>
                    <option value="TOUS">Tous niveaux</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="materialRequired">Matériel à prévoir</Label>
                <Input
                  id="materialRequired"
                  value={materialRequired}
                  onChange={(e) => setMaterialRequired(e.target.value)}
                  placeholder="Ex: Apportez votre tapis de yoga"
                  className="rounded-xl border-gray-200 mt-2"
                />
              </div>

              <div>
                <Label htmlFor="accessibility">Accessibilité</Label>
                <Input
                  id="accessibility"
                  value={accessibility}
                  onChange={(e) => setAccessibility(e.target.value)}
                  placeholder="Ex: PMR, parking à proximité"
                  className="rounded-xl border-gray-200 mt-2"
                />
              </div>

              {isPremium && (locationType === "PRESENTIAL_ONLY" || locationType === "HYBRID") && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-sauge/5 border border-sauge/20">
                  <input
                    type="checkbox"
                    id="allowOnSitePayment"
                    checked={allowOnSitePayment}
                    onChange={(e) => setAllowOnSitePayment(e.target.checked)}
                    className="rounded text-sauge focus:ring-sauge"
                  />
                  <Label htmlFor="allowOnSitePayment" className="cursor-pointer font-medium text-anthracite">
                    Autoriser le paiement sur place (espèces/chèque)
                  </Label>
                </div>
              )}

              {locationType !== "VIDEO_ONLY" && (
                <div>
                  <Label htmlFor="address">Adresse</Label>
                  <div className="mt-2">
                    <AddressAutocomplete
                      id="address"
                      value={address}
                      onChange={(addr, coords) => {
                        setAddress(addr);
                        setAddressLat(coords?.lat ?? null);
                        setAddressLng(coords?.lng ?? null);
                      }}
                      onSelect={({ lat, lng }) => {
                        setAddressLat(lat);
                        setAddressLng(lng);
                      }}
                      placeholder="Rechercher une adresse (ex: 10 rue de Paris, Pau)"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createEvent.isPending || updateEvent.isPending}
                  className="bg-sauge hover:bg-sauge/90 text-white rounded-xl"
                >
                  {editingEventId
                    ? updateEvent.isPending
                      ? "Enregistrement..."
                      : "Enregistrer"
                    : createEvent.isPending
                    ? "Création..."
                    : "Créer l'événement"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-xl border-gray-200"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 md:p-16 text-center">
            <Ticket className="h-14 w-14 mx-auto mb-4 text-sauge/50" />
            <p className="text-anthracite font-medium">Aucun événement pour le moment.</p>
            <p className="text-sm text-anthracite/70 mt-2">Créez votre première conférence ou atelier.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    {((event as { banner_url?: string }).banner_url || event.poster_url) && !(event.poster_url || "").toLowerCase().endsWith(".pdf") && (
                      <div className="relative w-full md:w-32 h-32 md:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image
                          src={posterSrc((event as { banner_url?: string }).banner_url || event.poster_url || "") || ""}
                          alt={event.title}
                          fill
                          className="object-cover"
                          unoptimized
                          sizes="128px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-sauge/10 text-sauge">
                              {EVENT_TYPE_LABELS[event.event_type || ""] || "Événement"}
                            </span>
                            {event.status === "canceled" && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                Annulé
                              </span>
                            )}
                            {event.confirmation_status === "CONFIRMED" && event.status !== "canceled" && (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-sauge/20 text-sauge">
                                Confirmé
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-anthracite">{event.title}</h3>
                          <p className="text-sm text-anthracite/70 mt-1 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-sauge" />
                            {format(new Date(event.date), "EEEE d MMMM yyyy à HH:mm", {
                              locale: fr,
                            })}
                          </p>
                          <p className="text-sm text-anthracite/60 mt-1">
                            {event.price_cents === 0
                              ? "Gratuit"
                              : `${(event.price_cents / 100).toFixed(2)} €`}{" "}
                            • {event.remaining_places}/{event.capacity} places
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sauge font-semibold">
                            <Euro className="h-4 w-4" />
                            {(event.totalRevenueCents / 100).toFixed(2)} €
                          </div>
                          <p className="text-xs text-anthracite/60">Revenu total</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadEventForEdit(event)}
                          className="rounded-xl border-gray-200"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Modifier
                        </Button>
                        <Link href={`/evenements/${event.slug}`} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-gray-200"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Voir la page publique
                          </Button>
                        </Link>
                        {event.status !== "canceled" &&
                          event.confirmation_status !== "CONFIRMED" &&
                          (event.tickets?.some((t) => t.status === "reserved_hold") ?? false) &&
                          event.totalTicketsSold >= ((event as { min_participants?: number }).min_participants ?? 1) && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              setConfirmCaptureInProgress(true);
                              try {
                                const result = await confirmAndCaptureEvent(event.id);
                                if (result.success) {
                                  queryClient.invalidateQueries({ queryKey: ["practitionerEvents"] });
                                } else if ("error" in result) {
                                  alert(result.error);
                                }
                              } finally {
                                setConfirmCaptureInProgress(false);
                              }
                            }}
                            disabled={confirmCaptureInProgress}
                            className="bg-sauge hover:bg-sauge/90 text-white rounded-xl"
                          >
                            {confirmCaptureInProgress ? "Capture..." : "Confirmer et capturer"}
                          </Button>
                        )}
                        {event.status !== "canceled" &&
                          event.confirmation_status !== "CONFIRMED" &&
                          (event.tickets?.some((t) => t.status === "reserved_hold") ?? false) &&
                          !(event.tickets?.some((t) => t.status === "confirmed") ?? false) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!confirm("Abandonner les réservations et libérer les fonds sans frais ?")) return;
                              setReleaseInProgress(true);
                              try {
                                const result = await cancelAndReleaseEvent(event.id);
                                if (result.success) {
                                  queryClient.invalidateQueries({ queryKey: ["practitionerEvents"] });
                                  setCancelConfirmId(null);
                                } else if ("error" in result) {
                                  alert(result.error);
                                }
                              } finally {
                                setReleaseInProgress(false);
                              }
                            }}
                            disabled={releaseInProgress}
                            className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            {releaseInProgress ? "..." : "Abandonner les réservations"}
                          </Button>
                        )}
                        {event.status !== "canceled" && (cancelConfirmId === event.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-anthracite/70">Rembourser les participants et annuler ?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelEvent(event.id)}
                              disabled={cancelInProgress}
                              className="rounded-xl"
                            >
                              Oui, annuler
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCancelConfirmId(null)}
                              disabled={cancelInProgress}
                              className="rounded-xl"
                            >
                              Non
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelConfirmId(event.id)}
                            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Annuler l&apos;événement
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-anthracite flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-sauge" />
                      Inscrits ({event.totalTicketsSold})
                    </h4>
                    {!event.tickets?.length && event.attendees.length === 0 ? (
                      <p className="text-sm text-anthracite/60">Aucun inscrit pour le moment</p>
                    ) : event.tickets?.length ? (
                      <ul className="space-y-2 text-sm text-anthracite/80">
                        {event.tickets.map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                            <span>
                              {t.users?.name || "Anonyme"} {t.users?.email && `(${t.users.email})`}
                              {t.quantity > 1 && ` × ${t.quantity}`}
                              {t.status === "payment_pending_offline" && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  À encaisser
                                </span>
                              )}
                              {t.status === "reserved_hold" && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  En attente de confirmation
                                </span>
                              )}
                            </span>
                            {t.status === "payment_pending_offline" && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  setCollectingTicketId(t.id);
                                  try {
                                    const res = await fetch(`/api/tickets/${t.id}/collect`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({}),
                                    });
                                    if (!res.ok) {
                                      const err = await res.json();
                                      throw new Error(err.error || "Erreur");
                                    }
                                    queryClient.invalidateQueries({ queryKey: ["practitionerEvents"] });
                                  } catch (e: unknown) {
                                    alert(e instanceof Error ? e.message : "Erreur lors de l'encaissement");
                                  } finally {
                                    setCollectingTicketId(null);
                                  }
                                }}
                                disabled={collectingTicketId === t.id}
                                className="bg-sauge hover:bg-sauge/90 text-white rounded-xl"
                              >
                                {collectingTicketId === t.id ? "En cours..." : "Encaisser"}
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="space-y-1 text-sm text-anthracite/80">
                        {event.attendees.map((a, i) => (
                          <li key={i}>
                            {a.name || "Anonyme"} {a.email && `(${a.email})`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

import { z } from "zod";

export const appointmentSchema = z.object({
  serviceId: z.string().min(1, "Service requis"),
  practitionerId: z.string().min(1, "Praticien requis"),
  startsAt: z.union([
    z.date(),
    z.string().datetime().transform((str) => new Date(str)),
    z.string().transform((str) => {
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        throw new Error("Date invalide");
      }
      return date;
    }),
  ]),
  userId: z.string().optional(), // For practitioners creating appointments for clients
  newClient: z.object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().optional(),
  }).optional(), // For creating a new client
});

export const reviewSchema = z.object({
  appointmentId: z.string().optional(),
  practitionerId: z.string().min(1, "Praticien requis"),
  rating: z.number().min(1).max(5, "Note entre 1 et 5"),
  comment: z.string().optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  durationMin: z.number().min(15, "Durée minimale: 15 minutes"),
  priceCents: z.number().min(0, "Prix requis"),
  description: z.string().optional(),
});

export const practitionerSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  bio: z.string().min(10, "Bio requise (minimum 10 caractères)"),
  locationCity: z.string().min(1, "Ville requise"),
  categoryId: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
});


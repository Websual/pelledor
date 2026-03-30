import { NextAuthOptions, DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
// import { PrismaAdapter } from "@next-auth/prisma-adapter"; // Supprimé pour NextAuth v5

import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { getLinkingUserId } from "./account-linking";

// Variable globale pour stocker l'userId de la session actuelle lors d'une liaison de compte
// Utilisée pour forcer la liaison au compte de la session actuelle plutôt qu'au compte trouvé par email
// Clé: sessionToken, Valeur: userId
const linkingUserIdCache = new Map<string, string>();

// Types personnalisés pour NextAuth étendu
interface ExtendedSession extends DefaultSession {
  user: DefaultSession["user"] & {
    id: string;
    role: string;
    practitionerId?: string | null;
  };
}

interface ExtendedJWT extends JWT {
  practitionerId?: string | null;
}

// Helper pour vérifier si un provider OAuth est configuré
const isGoogleConfigured = () => {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID !== "" &&
    process.env.GOOGLE_CLIENT_SECRET !== ""
  );
};

const isAppleConfigured = () => {
  return !!(
    process.env.APPLE_ID &&
    process.env.APPLE_SECRET &&
    process.env.APPLE_ID !== "" &&
    process.env.APPLE_SECRET !== ""
  );
};


// Construire la liste des providers de manière conditionnelle
const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.users.findUnique({
        where: {
          email: credentials.email,
        },
      });

      if (!user || !user.hashed_password) {
        return null;
      }

      const isPasswordValid = await compare(
        credentials.password,
        user.hashed_password
      );

      if (!isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

// Scopes Google Calendar (synchronisation) + auth de base
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

// Ajouter Google seulement si configuré
if (isGoogleConfigured()) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Permet de lier Google à un compte existant
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
          scope: GOOGLE_SCOPES,
        },
      },
    })
  );
}

// Ajouter Apple seulement si configuré
if (isAppleConfigured()) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
      // Apple nécessite au moins un email pour l'authentification
      // Si l'utilisateur choisit "Hide My Email", Apple générera un email privé
    })
  );
}

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma) as any, // Supprimé pour NextAuth v5
  providers,
  session: {
    strategy: "jwt",
  },
    pages: {
      signIn: "/connexion",
      newUser: "/inscription",
      error: "/connexion",
    },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        // Récupérer toujours le rôle actuel depuis la base pour supporter les mises à jour dynamiques
        try {
          const dbUser = await prisma.users.findUnique({
            where: { id: user.id },
            select: { role: true }
          });
          token.role = dbUser?.role || "CLIENT";

          // Récupérer l'ID du praticien séparément si l'utilisateur est PRACTITIONER
          if (dbUser?.role === "PRACTITIONER") {
            const practitioner = await prisma.practitioners.findFirst({
              where: { user_id: user.id },
              select: { id: true }
            });
            token.practitionerId = practitioner?.id || null;
          } else {
            token.practitionerId = null;
          }
          console.log(`[NextAuth] JWT: Retrieved role ${token.role} and practitionerId ${token.practitionerId} for user ${user.id}`);
        } catch (error) {
          console.error('[NextAuth] JWT: Error retrieving user data:', error);
          token.role = "CLIENT";
          token.practitionerId = null;
        }
      }

      // Pour les mises à jour dynamiques (signIn, etc.), rafraîchir depuis la base
      if (trigger === "signIn" || trigger === "update") {
        try {
          const dbUser = await prisma.users.findUnique({
            where: { id: token.id as string },
            select: { role: true }
          });
          token.role = dbUser?.role || "CLIENT";

          // Récupérer l'ID du praticien séparément si l'utilisateur est PRACTITIONER
          if (dbUser?.role === "PRACTITIONER") {
            const practitioner = await prisma.practitioners.findFirst({
              where: { user_id: token.id as string },
              select: { id: true }
            });
            token.practitionerId = practitioner?.id || null;
          } else {
            token.practitionerId = null;
          }
          console.log(`[NextAuth] JWT Update: Refreshed role ${token.role} and practitionerId ${token.practitionerId} for user ${token.id}`);
        } catch (error) {
          console.error('[NextAuth] JWT Update: Error refreshing data:', error);
        }
      }

      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedJWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as any) || "CLIENT";
        session.user.practitionerId = token.practitionerId;
      }
      return session as DefaultSession;
    },
    async signIn({ user, account, profile }) {
      // Debug OAuth
      if (account?.provider === "google" || account?.provider === "apple") {
        console.log(`[NextAuth] SignIn OAuth: ${account.provider}`, {
          user: user.email,
          callbackUrl: account.callbackUrl,
        });

        try {
          // Récupérer l'userId cible depuis le cache de liaison (si l'utilisateur est déjà connecté)
          // Le cache est rempli par l'API route /api/auth/link-google avant la redirection OAuth
          let targetUserId: string | null = null;
          
          // Essayer de récupérer depuis callbackUrl (si passé via signIn avec linkToken)
          const callbackUrlStr = account.callbackUrl as string | undefined;
          if (callbackUrlStr) {
            try {
              const url = new URL(callbackUrlStr, "http://localhost");
              const linkToken = url.searchParams.get("linkToken");
              if (linkToken) {
                targetUserId = getLinkingUserId(linkToken);
                if (targetUserId) {
                  console.log(`[NextAuth] Linking account to userId from linkToken: ${targetUserId}`);
                }
              }
              // Fallback: essayer linkUserId directement (ancienne méthode)
              if (!targetUserId) {
                const linkUserId = url.searchParams.get("linkUserId");
                if (linkUserId) {
                  targetUserId = linkUserId;
                  console.log(`[NextAuth] Linking account to userId from callbackUrl: ${targetUserId}`);
                }
              }
            } catch (e) {
              // Ignore URL parsing errors
            }
          }

          // Vérifier si l'utilisateur existe déjà
          const existingUser = await prisma.users.findUnique({
            where: { email: user.email! },
          });

          // Si on a un targetUserId (liaison forcée), utiliser celui-ci
          // Sinon, utiliser l'utilisateur existant ou créer un nouveau
          let finalUserId: string;
          if (targetUserId) {
            // Vérifier que le targetUserId existe
            const targetUser = await prisma.users.findUnique({
              where: { id: targetUserId },
            });
            if (!targetUser) {
              console.error(`[NextAuth] Target userId ${targetUserId} not found, falling back to email lookup`);
              targetUserId = null;
            } else {
              finalUserId = targetUserId;
              console.log(`[NextAuth] Forcing account link to userId: ${finalUserId}`);
            }
          }

          if (!targetUserId) {
            if (!existingUser) {
              // Créer l'utilisateur OAuth
              finalUserId = user.id!;
              await prisma.users.create({
                data: {
                  id: finalUserId,
                  name: user.name!,
                  email: user.email!,
                  image: user.image,
                  role: "CLIENT", // Par défaut CLIENT, peut être changé lors de la réclamation
                  updated_at: new Date(),
                },
              });
              console.log(`[NextAuth] Created new OAuth user: ${user.email}`);
            } else {
              // Utiliser l'utilisateur existant
              finalUserId = existingUser.id;
              // Mettre à jour les informations si nécessaire
              await prisma.users.update({
                where: { id: finalUserId },
                data: {
                  name: user.name!,
                  image: user.image,
                  updated_at: new Date(),
                },
              });
              console.log(`[NextAuth] Updated existing OAuth user: ${user.email}`);
            }
          } else {
            // Liaison forcée : mettre à jour les infos de l'utilisateur cible si nécessaire
            await prisma.users.update({
              where: { id: finalUserId },
              data: {
                name: user.name!,
                image: user.image,
                updated_at: new Date(),
              },
            });
          }

          // Créer/mettre à jour le compte OAuth (access_token, refresh_token, expires_at
          // pour Google Calendar sync, notamment quand le pro n'est pas connecté)
          const updateData: {
            access_token: string | undefined;
            refresh_token?: string | null;
            expires_at: number | null | undefined;
            id_token?: string | null;
            scope?: string | null;
          } = {
            access_token: account.access_token ?? undefined,
            expires_at: account.expires_at ?? null,
            id_token: account.id_token ?? undefined,
          };
          // Ne pas écraser refresh_token si Google n'en renvoie pas (connexions suivantes)
          if (account.refresh_token != null) {
            updateData.refresh_token = account.refresh_token;
          }
          if (account.scope != null) {
            updateData.scope = account.scope;
          }

          // Utiliser finalUserId pour lier le compte (peut être différent de user.id si liaison forcée)
          await prisma.accounts.upsert({
            where: {
              provider_provider_account_id: {
                provider: account.provider,
                provider_account_id: account.providerAccountId,
              },
            },
            update: updateData,
            create: {
              id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              user_id: finalUserId, // Utiliser finalUserId (peut être différent si liaison forcée)
              provider: account.provider,
              provider_account_id: account.providerAccountId,
              type: account.type,
              access_token: account.access_token ?? undefined,
              refresh_token: account.refresh_token ?? undefined,
              expires_at: account.expires_at ?? undefined,
              id_token: account.id_token ?? undefined,
              scope: account.scope ?? undefined,
            },
          });

          // Si liaison forcée, mettre à jour user.id pour que NextAuth utilise le bon userId
          if (targetUserId && user.id !== finalUserId) {
            (user as any).id = finalUserId;
            console.log(`[NextAuth] Updated user.id to ${finalUserId} for account linking`);
          }

          return true;
        } catch (error) {
          console.error("[NextAuth] Error in signIn callback:", error);
          return `/connexion?error=auth`;
        }
      }
      // Pour les credentials, la validation est déjà faite dans authorize
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Redirections par défaut après connexion
      // NextAuth gère automatiquement le callbackUrl, donc on autorise les URLs avec callbackUrl
      if (url.includes('/api/auth/callback/') || url.includes('callbackUrl')) {
        // Si l'URL contient callbackUrl, NextAuth le gère automatiquement
        // On autorise les redirections vers /pro/settings (pour la liaison de compte)
        if (url.includes('/pro/settings')) {
          try {
            const urlObj = new URL(url, baseUrl);
            const callbackUrl = urlObj.searchParams.get("callbackUrl");
            if (callbackUrl) {
              const decoded = decodeURIComponent(callbackUrl);
              if (decoded.startsWith("/")) {
                return `${baseUrl}${decoded}`;
              }
              if (decoded.startsWith(baseUrl)) {
                return decoded;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        return baseUrl; // Fallback vers home
      }

      // Éviter les redirections directes vers des pages protégées
      // Laisser la logique de page gérer les accès
      if (url.includes('/pro/dashboard') || (url.includes('/pro/') && !url.includes('/pro/settings'))) {
        // Ne pas rediriger directement vers des pages pro (sauf settings pour la liaison)
        // La logique de callbackUrl explicite dans les boutons gère ça
        return baseUrl;
      }

      // Autoriser /pro/settings (pour la liaison de compte)
      if (url.includes('/pro/settings')) {
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }
        try {
          const urlObj = new URL(url);
          if (urlObj.origin === baseUrl) {
            return url;
          }
        } catch {
          // Ignore parsing errors
        }
      }

      // Si l'URL est relative, la convertir en absolue
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Si l'URL est sur le même domaine, l'autoriser
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch {
        // Si l'URL n'est pas valide, retourner la baseUrl
      }
      // Par défaut, retourner la baseUrl
      return baseUrl;
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true, // Forcer HTTPS derrière Nginx
        domain: process.env.NODE_ENV === 'production' ? '.holia.me' : undefined,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'production' ? '.holia.me' : undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'production' ? '.holia.me' : undefined,
      },
    },
  },
  events: {
    async signIn(message) {
      //console.log("[NextAuth] Event signIn:", message);
    },
    async signOut(message) {
      //console.log("[NextAuth] Event signOut:", message);
    },
    async createUser(message) {
      //console.log("[NextAuth] Event createUser:", message);
    },
    async updateUser(message) {
      //console.log("[NextAuth] Event updateUser:", message);
    },
    async linkAccount(message) {
      //console.log("[NextAuth] Event linkAccount:", message);
    },
    async session(message) {
      //console.log("[NextAuth] Event session:", message);
    },
  },
  logger: {
    error(code, metadata) {
      // Aide au debug 500: consigner les erreurs NextAuth côté serveur
      console.error("[next-auth][error]", code, JSON.stringify({ code, metadata }, null, 2));
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, metadata) {
      //console.log("[next-auth][debug]", code, JSON.stringify(metadata, null, 2));
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};


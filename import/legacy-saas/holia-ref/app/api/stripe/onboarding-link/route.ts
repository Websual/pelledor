import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";



export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "PRACTITIONER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer le praticien avec les informations utilisateur
    const practitioner = await prisma.practitioners.findFirst({
      where: { user_id: session.user.id },
      include: {
        users: {
          select: {
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    let accountId = practitioner.stripe_account_id;
    let shouldCreateNewAccount = false;

    // Si un compte existe, vérifier s'il est utilisable
    if (accountId) {
      try {
        const existingAccount = await stripe.accounts.retrieve(accountId);
        // Si le compte est dans un état invalide ou bloqué, créer un nouveau compte
        if (existingAccount.details_submitted === false && 
            existingAccount.requirements?.disabled_reason) {
          console.log("[Stripe Onboarding] Existing account is disabled, creating new one");
          shouldCreateNewAccount = true;
        }
      } catch (error: any) {
        console.log("[Stripe Onboarding] Error retrieving existing account, creating new one:", error.message);
        shouldCreateNewAccount = true;
      }
    }

    // Créer un compte Stripe Connect Express s'il n'existe pas ou s'il est invalide
    if (!accountId || shouldCreateNewAccount) {
      // Préparer les informations à préremplir selon la documentation Stripe
      // https://docs.stripe.com/api/accounts/create
      const accountData: any = {
        type: "express",
        country: "FR",
        email: practitioner.users?.email || session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      };

      // Préremplir les informations individuelles si disponibles
      if (practitioner.first_name || practitioner.last_name || practitioner.users?.name) {
        const nameParts = practitioner.users?.name?.split(" ") || [];
        accountData.individual = {
          first_name: practitioner.first_name || nameParts[0] || undefined,
          last_name: practitioner.last_name || nameParts.slice(1).join(" ") || undefined,
          email: practitioner.users?.email || session.user.email || undefined,
          phone: practitioner.phone || practitioner.users?.phone || undefined,
        };
      }

      // Préremplir le business_profile si disponible
      if (practitioner.website || practitioner.title) {
        accountData.business_profile = {
          url: practitioner.website || undefined,
          name: practitioner.title || undefined,
        };
      }

      // Définir le type de business (individual par défaut pour les praticiens)
      accountData.business_type = "individual";

      console.log("[Stripe Onboarding] Creating account with prefilled data:", {
        email: accountData.email,
        hasIndividual: !!accountData.individual,
        hasBusinessProfile: !!accountData.business_profile,
      });

      const account = await stripe.accounts.create(accountData);

      accountId = account.id;

      // Sauvegarder l'ID du compte
      await prisma.practitioners.update({
        where: { id: practitioner.id },
        data: { 
          stripe_account_id: accountId,
          stripe_onboarding_complete: false, // Réinitialiser le statut
        },
      });
      
      console.log("[Stripe Onboarding] Created new account:", accountId);
    }

    // Vérifier le statut du compte Stripe
    let account;
    try {
      account = await stripe.accounts.retrieve(accountId);
      console.log("[Stripe Onboarding] Account status:", {
        id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        currently_due: account.requirements?.currently_due?.length || 0,
        eventually_due: account.requirements?.eventually_due?.length || 0,
      });
    } catch (error: any) {
      console.error("[Stripe Onboarding] Error retrieving account:", error);
      throw new Error(`Failed to retrieve account: ${error.message}`);
    }

    // Créer le lien d'onboarding ou de mise à jour
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://holia.me";
    console.log("[Stripe Onboarding] Creating account link for account:", accountId);
    console.log("[Stripe Onboarding] Using base URL:", baseUrl);
    
    // Déterminer le type de lien à utiliser
    // Règle Stripe : account_update ne peut être utilisé QUE si details_submitted = true
    // Sinon, on doit utiliser account_onboarding même si le compte existe
    const hasMissingInfo = (account.requirements?.currently_due?.length || 0) > 0 || 
                           (account.requirements?.eventually_due?.length || 0) > 0;
    
    // Utiliser account_update uniquement si details_submitted = true ET qu'il y a des infos manquantes
    // Sinon, utiliser account_onboarding (même pour un compte existant non complété)
    const linkType = account.details_submitted && hasMissingInfo
                     ? "account_update" 
                     : "account_onboarding";
    
    console.log("[Stripe Onboarding] Using link type:", linkType, {
      details_submitted: account.details_submitted,
      hasMissingInfo,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/pro/settings?stripe_refresh=true`,
      return_url: `${baseUrl}/pro/settings?stripe_success=true`,
      type: linkType,
    });

    console.log("[Stripe Onboarding] Account link created successfully:", accountLink.url);
    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("Stripe onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create onboarding link", details: error.message },
      { status: 500 }
    );
  }
}



# SaaS OS — Les 3 métiers à rendre excellents en premier

_Analyse CTO/stratégique — 2026-03-28_

---

## 🥇 #1 — PRATICIEN (médecin, kiné, ostéo, psy, etc.)

### Pourquoi ce métier en premier ?
- **Marché FR/BE/CH** : ~200 000 praticiens libéraux. Taux de digitalisation faible, douleur forte (Doctolib = 60€/mois, pas d'outil de gestion complet)
- **Ticket élevé** : les praticiens paient sans rechigner pour ce qui "marche" — ROI immédiat visible
- **Faible concurrence sur le "tout-en-un" TPE** : Doctolib = prise de RDV seulement, pas de CRM/facturation/notes
- **Implémentation** : logique métier claire et répétable (RDV → consultation → facture)

### 5 fonctionnalités "wow"
1. **Agenda intelligent** — vue semaine/jour, créneaux récurrents, gestion des absences, buffer inter-RDV configurable
2. **Prise de RDV en ligne embarquée** — lien public personnalisé, confirmation SMS/email automatique, rappel J-1
3. **Fiche patient** — historique consultations, notes SOAP, documents, allergies — accessible en 1 clic avant le RDV
4. **Facturation conforme** — génération devis/facture PDF, mention "acquittée", export comptable CSV, suivi impayés
5. **Téléconsultation intégrée** — lien visio généré automatiquement à la confirmation RDV (Jitsi ou Daily.co embed)

### Module manquant critique
**Formulaire d'anamnèse en ligne** — envoyé au patient avant le premier RDV, rempli depuis son mobile, intégré automatiquement dans la fiche. Gain de temps réel, différenciateur fort.

---

## 🥈 #2 — RESTAURANT

### Pourquoi ce métier ?
- **Marché FR/BE/CH** : ~175 000 restaurants. 80% sont TPE/indépendants, sous-équipés digitalement
- **Douleur aiguë** : TheFork prend 2€/couvert + abonnement. Pas d'outil intégré résa + commande + caisse
- **Effet démo rapide** : une belle page publique + système de réservation = visible immédiatement
- **Buzz potentiel** : si ça marche pour un resto populaire = bouche-à-oreille fort

### 4 fonctionnalités "wow"
1. **Réservation en ligne zero-commission** — widget intégrable, plan de salle visuel, gestion des couverts en temps réel
2. **Menu digital QR code** — menu à jour en temps réel, photos, allergènes, disponibilité plat du jour
3. **Gestion des listes d'attente** — SMS automatique quand une table se libère, délai estimé affiché
4. **CRM clients simple** — historique des visites, préférences, anniversaires → email fidélisation automatique

### Module manquant critique
**Click & Collect / commande à emporter** — prise de commande en ligne avec créneau horaire, paiement Stripe intégré. Argument de revenu supplémentaire direct pour le restaurateur.

---

## 🥉 #3 — ARTISAN (plombier, électricien, menuisier, peintre…)

### Pourquoi ce métier ?
- **Marché FR/BE/CH** : ~600 000 artisans du bâtiment. 70% sans outil de gestion numérique
- **Douleur immédiate** : devis perdus, factures non relancées, planning désorganisé = argent laissé sur la table
- **Acquisition facile** : les artisans se parlent entre eux — 1 satisfait = 5 leads
- **Flux simple** : prospect → devis → chantier → facture

### 5 fonctionnalités "wow"
1. **Générateur de devis ultra-rapide** — catalogue de prestations, TVA auto, PDF professionnel en 2 minutes
2. **Suivi chantier** — statuts, photos avant/après depuis mobile, partage client en 1 lien
3. **Signature électronique du devis** — client signe depuis son téléphone, notification artisan
4. **Relance automatique des devis** — sans réponse après 7 jours → email de relance automatique avec PDF
5. **Tableau de bord financier** — CA du mois, devis en attente, factures impayées

### Module manquant critique
**Déclaration automatique MaPrimeRénov' / CEE** — les artisans RGE perdent un temps fou sur les dossiers d'aides. Checklist + génération docs = argument massif avec la vague réno énergétique.

---

## Récapitulatif stratégique

| Priorité | Métier | Taille marché | Douleur | ROI démo |
|---|---|---|---|---|
| 1 | Praticien | ★★★★ | ★★★★★ | ★★★★★ |
| 2 | Restaurant | ★★★★★ | ★★★★ | ★★★★★ |
| 3 | Artisan | ★★★★★ | ★★★★★ | ★★★★ |

**Logique du séquençage :** Praticien d'abord — ticket élevé + démo produit immédiate (RDV = résultat visible J+1). Restaurant en second — effet vitrine public. Artisan en troisième — marché colossal mais cycle de vente légèrement plus long.

**Règle cardinale :** 3 blueprints "10/10" > 9 blueprints "5/10". Ne pas diluer.

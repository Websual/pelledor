'use client';

import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FAQAccordion } from "@/components/faq-accordion";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  Calendar,
  CreditCard,
  Search,
  Users,
  FileText,
  Shield,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Leaf,
  Waves,
  Brain,
  Bone,
  Hand,
  Activity,
  Heart,
  Target,
  Sparkles,
  Flower,
  Moon,
  Star,
  MapPin,
} from "lucide-react";

// Dictionnaire de contenu pour chaque profession
const professionContent: Record<string, {
  heroDescription: string; // Texte unique pour le hero (sous le titre)
  definition: string; // Texte pour "C'est quoi un [Profession] ?"
  when: string[];
  benefits: string[];
}> = {
  naturopathe: {
    heroDescription: "Découvrez une approche naturelle et holistique de votre santé. Nos naturopathes certifiés vous accompagnent vers un équilibre optimal grâce à des méthodes douces et respectueuses de votre organisme.",
    definition: "La naturopathie est une médecine non conventionnelle qui vise à équilibrer le fonctionnement de l'organisme par des moyens naturels : alimentation, hygiène de vie, phytothérapie.",
    when: ["Troubles digestifs", "Fatigue chronique", "Gestion du poids", "Renforcement immunitaire"],
    benefits: ["Équilibre durable", "Approche personnalisée", "Solutions 100% naturelles"]
  },
  sophrologue: {
    heroDescription: "Retrouvez sérénité et équilibre grâce à des techniques de relaxation adaptées à vos besoins. Nos sophrologues vous enseignent des outils concrets pour mieux gérer votre quotidien et développer vos ressources personnelles.",
    definition: "La sophrologie est une méthode psychocorporelle utilisée comme technique de relaxation et outil thérapeutique, basée sur la respiration et la visualisation positive.",
    when: ["Gestion du stress", "Préparation aux examens", "Troubles du sommeil", "Confiance en soi"],
    benefits: ["Lâcher-prise immédiat", "Outils réutilisables", "Mieux-être mental"]
  },
  hypnotherapeute: {
    heroDescription: "Libérez-vous de vos blocages et créez les changements que vous souhaitez dans votre vie. L'hypnose thérapeutique vous permet d'accéder à vos ressources inconscientes pour transformer durablement vos habitudes et comportements.",
    definition: "L'hypnothérapie est une technique thérapeutique qui utilise l'état de conscience modifiée pour accéder à l'inconscient et faciliter le changement de comportements.",
    when: ["Addictions", "Phobies", "Anxiété", "Gestion de la douleur"],
    benefits: ["Changements durables", "Approche douce", "Efficacité rapide"]
  },
  osteopathe: {
    heroDescription: "Soulagez vos douleurs et retrouvez votre mobilité grâce à des techniques manuelles douces et précises. L'ostéopathie considère votre corps dans son ensemble pour identifier et traiter la cause de vos troubles.",
    definition: "L'ostéopathie est une médecine manuelle qui traite les troubles fonctionnels du corps en agissant sur les structures musculo-squelettiques et viscérales.",
    when: ["Douleurs dorsales", "Migraines", "Troubles digestifs", "Problèmes articulaires"],
    benefits: ["Soulagement rapide", "Approche globale", "Prévention des récidives"]
  },
  reflexologue: {
    heroDescription: "Offrez-vous un moment de détente profonde et de rééquilibrage énergétique. La réflexologie stimule les zones réflexes de vos pieds et mains pour harmoniser votre organisme et favoriser votre bien-être global.",
    definition: "La réflexologie est une technique de massage des pieds et des mains qui stimule les zones réflexes correspondant aux différents organes et systèmes du corps.",
    when: ["Stress et tension", "Troubles circulatoires", "Douleurs chroniques", "Fatigue"],
    benefits: ["Détente profonde", "Amélioration de la circulation", "Rééquilibrage énergétique"]
  },
  kinesitherapeute: {
    heroDescription: "Récupérez votre mobilité et votre autonomie grâce à des programmes de rééducation personnalisés. Nos kinésithérapeutes vous accompagnent dans votre récupération avec des techniques adaptées à votre situation.",
    definition: "La kinésithérapie est une discipline de la santé qui utilise le mouvement et l'exercice pour prévenir, traiter et rééduquer les troubles musculo-squelettiques.",
    when: ["Rééducation post-opératoire", "Blessures sportives", "Douleurs chroniques", "Troubles posturaux"],
    benefits: ["Récupération fonctionnelle", "Prévention des récidives", "Amélioration de la mobilité"]
  },
  psychologue: {
    heroDescription: "Prenez soin de votre santé mentale avec un accompagnement bienveillant et professionnel. Nos psychologues vous offrent un espace d'écoute et de compréhension pour traverser les difficultés et développer votre bien-être émotionnel.",
    definition: "La psychologie est une science qui étudie le comportement humain et les processus mentaux, offrant un accompagnement thérapeutique pour améliorer le bien-être mental.",
    when: ["Dépression", "Anxiété", "Traumatismes", "Difficultés relationnelles"],
    benefits: ["Compréhension de soi", "Gestion émotionnelle", "Développement personnel"]
  },
  "coach-bien-etre": {
    heroDescription: "Transformez votre vie et atteignez vos objectifs avec un accompagnement personnalisé. Le coaching bien-être vous donne les clés pour développer votre potentiel et créer l'équilibre de vie que vous méritez.",
    definition: "Le coaching bien-être est un accompagnement personnalisé qui vous aide à définir vos objectifs, développer votre potentiel et créer un équilibre de vie harmonieux.",
    when: ["Manque de motivation", "Définition d'objectifs", "Gestion du temps", "Équilibre vie pro/perso"],
    benefits: ["Clarté des objectifs", "Motivation renforcée", "Changements concrets"]
  },
  acupuncteur: {
    heroDescription: "Découvrez les bienfaits millénaires de la médecine traditionnelle chinoise. L'acupuncture rééquilibre votre énergie vitale pour traiter naturellement de nombreux troubles et restaurer votre équilibre global.",
    definition: "L'acupuncture est une technique de médecine traditionnelle chinoise qui consiste à stimuler des points précis du corps avec des aiguilles pour rééquilibrer l'énergie.",
    when: ["Douleurs chroniques", "Troubles digestifs", "Allergies", "Insomnies"],
    benefits: ["Rééquilibrage énergétique", "Soulagement naturel", "Approche holistique"]
  },
  magnetiseur: {
    heroDescription: "Expérimentez les soins énergétiques par magnétisme pour réharmoniser votre corps et favoriser votre guérison naturelle. Cette technique douce complète efficacement les soins médicaux traditionnels.",
    definition: "Le magnétisme curatif est une technique de soin énergétique qui utilise l'énergie naturelle pour rééquilibrer l'organisme et favoriser les processus d'auto-guérison.",
    when: ["Douleurs", "Inflammations", "Brûlures", "Troubles cutanés"],
    benefits: ["Soulagement immédiat", "Rééquilibrage énergétique", "Approche douce"]
  },
  "praticien-reiki": {
    heroDescription: "Harmonisez votre énergie vitale et retrouvez votre équilibre intérieur. Le Reiki canalise l'énergie universelle pour rééquilibrer vos chakras et favoriser une détente profonde et un bien-être durable.",
    definition: "Le Reiki est une technique de soin énergétique japonaise qui canalise l'énergie universelle pour rééquilibrer les chakras et favoriser le bien-être global.",
    when: ["Stress et anxiété", "Fatigue", "Douleurs", "Troubles du sommeil"],
    benefits: ["Détente profonde", "Harmonisation énergétique", "Bien-être global"]
  },
  therapeute: {
    heroDescription: "Bénéficiez d'une approche thérapeutique complète qui considère votre corps, votre esprit et vos émotions comme un tout. La thérapie holistique vous accompagne vers un équilibre global et un bien-être durable.",
    definition: "La thérapie holistique est une approche globale du bien-être qui considère l'individu dans sa globalité : corps, esprit et émotions, pour favoriser l'équilibre et la guérison.",
    when: ["Bien-être global", "Développement personnel", "Gestion émotionnelle", "Équilibre de vie"],
    benefits: ["Approche complète", "Personnalisation", "Bien-être durable"]
  }
};

// Ordre des professions pour la navigation
const professionsOrder = [
  "naturopathe",
  "sophrologue",
  "hypnotherapeute",
  "osteopathe",
  "reflexologue",
  "kinesitherapeute",
  "psychologue",
  "coach-bien-etre",
  "acupuncteur",
  "magnetiseur",
  "praticien-reiki",
  "therapeute",
];

// FAQ spécifiques par profession
const professionFAQ: Record<string, Array<{ question: string; answer: string }>> = {
  naturopathe: [
    {
      question: "Les consultations de naturopathie sont-elles remboursées ?",
      answer: "Les consultations de naturopathie ne sont généralement pas remboursées par la Sécurité Sociale. Cependant, certaines mutuelles complémentaires proposent un remboursement partiel ou total des séances de naturopathie. Renseignez-vous auprès de votre mutuelle pour connaître les conditions de prise en charge."
    },
    {
      question: "Comment se déroule une séance de naturopathie ?",
      answer: "Une première consultation dure généralement entre 1h et 1h30. Le naturopathe réalise un bilan de vitalité complet (anamnèse, analyse du mode de vie, alimentation, sommeil, stress). Il établit ensuite un programme personnalisé avec des conseils en alimentation, phytothérapie, exercices et techniques de relaxation adaptés à vos besoins."
    },
    {
      question: "Quelle est la différence entre un naturopathe et un médecin ?",
      answer: "Le naturopathe n'est pas un médecin et ne pose pas de diagnostic médical. Il complète l'approche médicale en se concentrant sur la prévention et le renforcement des capacités d'auto-guérison de l'organisme. Le naturopathe travaille en complémentarité avec la médecine conventionnelle et peut vous orienter vers un médecin si nécessaire."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Le nombre de séances varie selon vos objectifs et votre situation. Une première consultation permet d'établir un bilan et un programme personnalisé. Des séances de suivi (généralement 3 à 6 mois après) permettent d'ajuster le programme et d'évaluer les progrès. La fréquence dépend de vos besoins spécifiques."
    }
  ],
  sophrologue: [
    {
      question: "Les séances de sophrologie sont-elles remboursées ?",
      answer: "Les séances de sophrologie ne sont pas remboursées par la Sécurité Sociale. Cependant, de nombreuses mutuelles complémentaires proposent un remboursement partiel ou total des séances de sophrologie, notamment pour la gestion du stress et la préparation aux examens. Vérifiez les conditions avec votre mutuelle."
    },
    {
      question: "Comment se passe une séance de sophrologie ?",
      answer: "Une séance de sophrologie dure généralement entre 45 minutes et 1 heure. Le sophrologue vous guide à travers des exercices de respiration, de relaxation musculaire et de visualisation positive. Vous êtes assis ou debout, les yeux fermés, et suivez les instructions verbales du praticien. Les techniques apprises peuvent être reproduites chez vous."
    },
    {
      question: "Combien de séances faut-il pour voir des résultats ?",
      answer: "Les premiers effets peuvent être ressentis dès la première séance (détente, lâcher-prise). Pour des résultats durables, un cycle de 8 à 12 séances est généralement recommandé, à raison d'une séance par semaine. Le sophrologue vous enseigne des techniques que vous pourrez ensuite pratiquer en autonomie."
    },
    {
      question: "La sophrologie peut-elle remplacer un traitement médical ?",
      answer: "Non, la sophrologie ne remplace pas un traitement médical. C'est une méthode complémentaire qui peut accompagner un suivi médical en aidant à mieux gérer le stress, l'anxiété ou la douleur. Elle améliore votre qualité de vie et votre bien-être, mais ne traite pas les pathologies médicales."
    }
  ],
  hypnotherapeute: [
    {
      question: "L'hypnothérapie est-elle remboursée ?",
      answer: "Les séances d'hypnothérapie ne sont pas remboursées par la Sécurité Sociale. Certaines mutuelles complémentaires peuvent proposer un remboursement partiel, notamment pour l'arrêt du tabac ou la gestion du poids. Renseignez-vous auprès de votre mutuelle pour connaître les conditions de prise en charge."
    },
    {
      question: "Comment se déroule une séance d'hypnothérapie ?",
      answer: "Une séance dure généralement entre 45 minutes et 1h30. Après un échange sur vos objectifs, l'hypnothérapeute vous guide vers un état de relaxation profonde (transe hypnotique). Dans cet état, vous restez conscient et en contrôle, mais plus réceptif aux suggestions positives pour créer les changements souhaités."
    },
    {
      question: "Peut-on être manipulé sous hypnose ?",
      answer: "Non, l'hypnose thérapeutique ne permet pas de vous faire faire quelque chose contre votre volonté ou vos valeurs. Vous restez conscient et en contrôle. L'hypnothérapeute travaille avec votre consentement et vos objectifs personnels. C'est un état de concentration et de relaxation, pas de perte de contrôle."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Le nombre de séances varie selon l'objectif. Pour l'arrêt du tabac ou une phobie simple, 1 à 3 séances peuvent suffire. Pour des problématiques plus complexes (addictions, traumatismes), un suivi de 5 à 10 séances peut être nécessaire. L'hypnothérapeute évalue vos besoins lors de la première consultation."
    }
  ],
  osteopathe: [
    {
      question: "Les consultations d'ostéopathie sont-elles remboursées ?",
      answer: "Les consultations d'ostéopathie ne sont pas remboursées par la Sécurité Sociale, sauf si elles sont prescrites par un médecin dans certains cas spécifiques. Cependant, la plupart des mutuelles complémentaires proposent un remboursement partiel ou total des séances d'ostéopathie (généralement 2 à 4 séances par an)."
    },
    {
      question: "Comment se passe une séance d'ostéopathie ?",
      answer: "Une séance dure généralement entre 45 minutes et 1 heure. L'ostéopathe commence par un interrogatoire détaillé sur vos symptômes et votre historique médical. Il effectue ensuite des tests manuels pour identifier les restrictions de mobilité, puis réalise des manipulations douces pour rétablir l'équilibre de votre corps."
    },
    {
      question: "L'ostéopathie fait-elle mal ?",
      answer: "Les techniques ostéopathiques sont généralement douces et non douloureuses. Certaines manipulations peuvent créer une sensation de pression ou un léger inconfort, mais jamais de douleur intense. L'ostéopathe adapte ses techniques à votre sensibilité et à votre condition. Après la séance, vous pouvez ressentir une légère fatigue ou des courbatures qui disparaissent rapidement."
    },
    {
      question: "Quand consulter un ostéopathe ?",
      answer: "Vous pouvez consulter un ostéopathe pour des douleurs dorsales, cervicales, des migraines, des troubles digestifs, des problèmes articulaires, ou en prévention. L'ostéopathie est également utile après un traumatisme, une opération, ou pour les femmes enceintes. N'hésitez pas à consulter dès l'apparition des premiers symptômes."
    }
  ],
  reflexologue: [
    {
      question: "Les séances de réflexologie sont-elles remboursées ?",
      answer: "Les séances de réflexologie ne sont pas remboursées par la Sécurité Sociale. Cependant, certaines mutuelles complémentaires proposent un remboursement partiel ou total des séances de réflexologie, notamment dans le cadre des médecines douces ou du bien-être. Vérifiez les conditions avec votre mutuelle."
    },
    {
      question: "Comment se déroule une séance de réflexologie ?",
      answer: "Une séance dure généralement entre 45 minutes et 1 heure. Vous êtes allongé confortablement, les pieds nus. Le réflexologue effectue un massage des pieds en stimulant les zones réflexes correspondant aux différents organes et systèmes du corps. La séance est relaxante et peut être légèrement sensible sur certaines zones."
    },
    {
      question: "La réflexologie peut-elle traiter des maladies ?",
      answer: "La réflexologie ne prétend pas guérir des maladies. C'est une technique de bien-être qui favorise la relaxation, améliore la circulation et aide à rééquilibrer l'organisme. Elle peut compléter un traitement médical en améliorant votre bien-être général, mais ne remplace pas les soins médicaux conventionnels."
    },
    {
      question: "Combien de séances sont recommandées ?",
      answer: "Pour un bien-être optimal, une séance par mois peut être suffisante en entretien. Pour traiter un problème spécifique, un cycle de 4 à 6 séances à raison d'une par semaine est généralement recommandé. Le réflexologue adapte la fréquence selon vos besoins et vos objectifs."
    }
  ],
  kinesitherapeute: [
    {
      question: "Les séances de kinésithérapie sont-elles remboursées ?",
      answer: "Oui, les séances de kinésithérapie prescrites par un médecin sont remboursées par la Sécurité Sociale à hauteur de 60% (avec dépassement d'honoraires possible). Votre mutuelle complémentaire peut prendre en charge le reste à charge. Les séances non prescrites ne sont pas remboursées."
    },
    {
      question: "Comment se passe une séance de kinésithérapie ?",
      answer: "Une séance dure généralement entre 30 et 45 minutes. Le kinésithérapeute commence par évaluer votre condition, puis réalise des techniques de massage, de mobilisation, d'étirements ou vous fait pratiquer des exercices de rééducation. Il vous donne également des exercices à faire à domicile pour accélérer votre récupération."
    },
    {
      question: "Faut-il une ordonnance pour consulter un kinésithérapeute ?",
      answer: "Pour être remboursé, oui, une ordonnance médicale est nécessaire. Cependant, vous pouvez consulter un kinésithérapeute sans ordonnance pour des soins de bien-être, mais ces séances ne seront pas remboursées par la Sécurité Sociale. Certaines mutuelles peuvent néanmoins les prendre en charge."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Le nombre de séances dépend de votre pathologie et de votre récupération. Pour une rééducation post-opératoire, cela peut aller de 10 à 30 séances. Pour une blessure sportive, 5 à 15 séances sont généralement suffisantes. Le kinésithérapeute évalue votre progression et adapte le nombre de séances."
    }
  ],
  psychologue: [
    {
      question: "Les consultations de psychologue sont-elles remboursées ?",
      answer: "Depuis 2022, les consultations de psychologue sont partiellement remboursées par la Sécurité Sociale sur prescription médicale, dans le cadre du dispositif 'MonPsy'. Sans prescription, les séances ne sont pas remboursées par l'Assurance Maladie, mais de nombreuses mutuelles proposent un forfait annuel pour les consultations psychologiques."
    },
    {
      question: "Comment se déroule une consultation psychologique ?",
      answer: "Une séance dure généralement 45 minutes à 1 heure. Le psychologue vous offre un espace d'écoute bienveillant et confidentiel. Vous pouvez parler librement de vos difficultés, émotions et préoccupations. Le psychologue vous accompagne dans la compréhension de vos mécanismes et vous aide à développer des stratégies d'adaptation."
    },
    {
      question: "Quelle est la différence entre un psychologue et un psychiatre ?",
      answer: "Le psychologue a une formation universitaire en psychologie et utilise la thérapie par la parole. Il ne peut pas prescrire de médicaments. Le psychiatre est un médecin spécialisé qui peut prescrire des médicaments et combiner traitement médicamenteux et psychothérapie. Les deux peuvent travailler en complémentarité."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Le nombre de séances varie selon vos besoins. Pour un soutien ponctuel, quelques séances peuvent suffire. Pour un travail thérapeutique plus approfondi, un suivi régulier sur plusieurs mois ou années peut être nécessaire. La fréquence est généralement d'une séance par semaine au début, puis peut s'espacer selon votre évolution."
    }
  ],
  "coach-bien-etre": [
    {
      question: "Les séances de coaching bien-être sont-elles remboursées ?",
      answer: "Les séances de coaching bien-être ne sont pas remboursées par la Sécurité Sociale. Cependant, certaines mutuelles complémentaires proposent un forfait annuel pour les prestations de bien-être et de développement personnel. Renseignez-vous auprès de votre mutuelle pour connaître les conditions de prise en charge."
    },
    {
      question: "Comment se passe une séance de coaching bien-être ?",
      answer: "Une séance dure généralement entre 1h et 1h30. Le coach vous aide à clarifier vos objectifs, identifier vos blocages et développer un plan d'action concret. Il utilise des outils de questionnement, des techniques de développement personnel et vous donne des exercices pratiques à réaliser entre les séances."
    },
    {
      question: "Quelle est la différence entre un coach et un thérapeute ?",
      answer: "Le coach bien-être se concentre sur l'atteinte d'objectifs concrets et le développement de votre potentiel. Il travaille sur le présent et le futur. Le thérapeute traite les blessures du passé, les traumatismes et les troubles psychologiques. Le coaching est orienté action, la thérapie est orientée guérison."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Un accompagnement de coaching dure généralement entre 3 et 6 mois, à raison d'une séance toutes les 2 à 4 semaines. Le nombre exact dépend de vos objectifs et de votre rythme de progression. Le coach évalue régulièrement vos progrès et ajuste le programme selon vos besoins."
    }
  ],
  acupuncteur: [
    {
      question: "Les séances d'acupuncture sont-elles remboursées ?",
      answer: "Les séances d'acupuncture réalisées par un médecin-acupuncteur sont remboursées par la Sécurité Sociale comme des consultations médicales classiques. Les séances réalisées par un acupuncteur non-médecin ne sont pas remboursées par l'Assurance Maladie, mais peuvent être prises en charge par certaines mutuelles."
    },
    {
      question: "Comment se déroule une séance d'acupuncture ?",
      answer: "Une séance dure généralement entre 30 et 45 minutes. L'acupuncteur effectue d'abord un diagnostic selon les principes de la médecine traditionnelle chinoise (pouls, langue, questions). Il insère ensuite de fines aiguilles stériles à usage unique sur des points précis du corps. Les aiguilles restent en place 15 à 30 minutes."
    },
    {
      question: "L'acupuncture fait-elle mal ?",
      answer: "L'insertion des aiguilles peut créer une légère sensation de piqûre, suivie d'une sensation de lourdeur, de chaleur ou de fourmillement. La plupart des personnes trouvent la séance relaxante. Les aiguilles sont très fines (plus fines qu'une aiguille d'injection) et l'inconfort est généralement minime."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Pour un problème aigu, 2 à 4 séances peuvent suffire. Pour un problème chronique, un cycle de 6 à 10 séances est généralement recommandé, à raison d'une séance par semaine au début, puis espacées selon l'amélioration. L'acupuncteur évalue votre progression et adapte le traitement."
    }
  ],
  magnetiseur: [
    {
      question: "Les séances de magnétisme sont-elles remboursées ?",
      answer: "Les séances de magnétisme ne sont pas remboursées par la Sécurité Sociale. Certaines mutuelles complémentaires peuvent proposer un remboursement partiel dans le cadre des médecines alternatives ou du bien-être. Renseignez-vous auprès de votre mutuelle pour connaître les conditions de prise en charge."
    },
    {
      question: "Comment se passe une séance de magnétisme ?",
      answer: "Une séance dure généralement entre 30 et 45 minutes. Vous êtes allongé habillé. Le magnétiseur place ses mains à quelques centimètres ou en contact léger avec votre corps, au niveau des zones à traiter. Il canalise l'énergie naturelle pour rééquilibrer votre organisme. La séance est relaxante et non invasive."
    },
    {
      question: "Le magnétisme peut-il remplacer un traitement médical ?",
      answer: "Non, le magnétisme ne remplace pas un traitement médical. C'est une technique complémentaire qui peut aider à soulager certains symptômes (douleurs, inflammations, brûlures) et améliorer votre bien-être général. Il est important de continuer votre suivi médical et d'informer votre médecin de vos séances de magnétisme."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Le nombre de séances varie selon votre problématique. Pour une douleur aiguë ou une brûlure, 1 à 3 séances peuvent suffire. Pour un problème chronique, un suivi régulier peut être nécessaire (4 à 8 séances). Le magnétiseur évalue votre évolution et adapte la fréquence des séances."
    }
  ],
  "praticien-reiki": [
    {
      question: "Les séances de Reiki sont-elles remboursées ?",
      answer: "Les séances de Reiki ne sont pas remboursées par la Sécurité Sociale. Certaines mutuelles complémentaires proposent un remboursement partiel ou total des séances de Reiki dans le cadre des médecines énergétiques ou du bien-être. Vérifiez les conditions avec votre mutuelle."
    },
    {
      question: "Comment se déroule une séance de Reiki ?",
      answer: "Une séance dure généralement entre 45 minutes et 1 heure. Vous êtes allongé habillé sur une table de massage. Le praticien Reiki place ses mains à quelques centimètres au-dessus de votre corps, au niveau des chakras et des zones à harmoniser. Il canalise l'énergie universelle pour rééquilibrer votre système énergétique. La séance est très relaxante."
    },
    {
      question: "Le Reiki est-il une religion ?",
      answer: "Non, le Reiki n'est pas une religion. C'est une technique de soin énergétique d'origine japonaise qui ne nécessite aucune croyance particulière. Le Reiki est accessible à tous, quelle que soit votre spiritualité ou votre religion. C'est une méthode de bien-être et d'harmonisation énergétique."
    },
    {
      question: "Combien de séances sont recommandées ?",
      answer: "Pour un bien-être optimal, une séance par mois peut être suffisante en entretien. Pour traiter un problème spécifique (stress, douleurs, troubles du sommeil), un cycle de 4 à 6 séances à raison d'une par semaine est généralement recommandé. Le praticien Reiki adapte la fréquence selon vos besoins."
    }
  ],
  therapeute: [
    {
      question: "Les consultations de thérapie holistique sont-elles remboursées ?",
      answer: "Les séances de thérapie holistique ne sont généralement pas remboursées par la Sécurité Sociale. Cependant, certaines mutuelles complémentaires proposent un forfait annuel pour les médecines alternatives et les thérapies complémentaires. Renseignez-vous auprès de votre mutuelle pour connaître les conditions de prise en charge."
    },
    {
      question: "Comment se passe une séance de thérapie holistique ?",
      answer: "Une séance dure généralement entre 1h et 1h30. Le thérapeute holistique considère votre corps, votre esprit et vos émotions comme un tout. Il utilise différentes techniques adaptées à vos besoins : thérapie manuelle, énergétique, psychocorporelle, ou approches intégratives. La première séance comprend un bilan complet de votre situation."
    },
    {
      question: "Quelle est la différence avec une thérapie classique ?",
      answer: "La thérapie holistique considère l'individu dans sa globalité (corps, esprit, émotions, environnement) plutôt que de se concentrer uniquement sur un symptôme. Elle combine différentes approches thérapeutiques et peut intégrer des techniques manuelles, énergétiques et psychologiques pour favoriser un équilibre global."
    },
    {
      question: "Combien de séances sont nécessaires ?",
      answer: "Le nombre de séances varie selon vos besoins et votre objectif. Pour un accompagnement ponctuel, 3 à 5 séances peuvent suffire. Pour un travail plus approfondi, un suivi régulier sur plusieurs mois peut être nécessaire. Le thérapeute évalue votre progression et adapte la fréquence des séances."
    }
  ]
};

// Mapping des slugs vers les icônes
const professionIcons: Record<string, any> = {
  "naturopathe": Leaf,
  "sophrologue": Waves,
  "hypnotherapeute": Brain,
  "osteopathe": Bone,
  "reflexologue": Hand,
  "kinesitherapeute": Activity,
  "psychologue": Heart,
  "coach-bien-etre": Target,
  "acupuncteur": Sparkles,
  "magnetiseur": Flower,
  "praticien-reiki": Moon,
  "therapeute": Shield,
};

// Mapping des balises ALT pour les images hero
const heroImageAlts: Record<string, string> = {
  "naturopathe": "Consultation de naturopathie pour un équilibre global",
  "sophrologue": "Séance de sophrologie et gestion des émotions",
  "hypnotherapeute": "Accompagnement par l'hypnose thérapeutique",
  "osteopathe": "Soins d'ostéopathie douce pour le corps",
  "reflexologue": "Séance de réflexologie plantaire et détente",
  "kinesitherapeute": "Rééducation et kinésithérapie spécialisée",
  "psychologue": "Soutien psychologique et thérapie par la parole",
  "coach-bien-etre": "Coaching en développement personnel et bien-être",
  "acupuncteur": "Soins d'acupuncture et médecine traditionnelle chinoise",
  "magnetiseur": "Séance de magnétisme et rééquilibrage énergétique",
  "praticien-reiki": "Soins énergétiques Reiki pour la sérénité",
  "therapeute": "Thérapie holistique et approche bien-être",
};

// Mapping des noms de professions vers les noms de disciplines/thérapies (pour les titres)
const professionDisciplineNames: Record<string, string> = {
  "naturopathe": "la naturopathie",
  "sophrologue": "la sophrologie",
  "hypnotherapeute": "l'hypnothérapie",
  "osteopathe": "l'ostéopathie",
  "reflexologue": "la réflexologie",
  "kinesitherapeute": "la kinésithérapie",
  "psychologue": "la psychologie",
  "coach-bien-etre": "le coaching bien-être",
  "acupuncteur": "l'acupuncture",
  "magnetiseur": "le magnétisme",
  "praticien-reiki": "le Reiki",
  "therapeute": "la thérapie holistique",
};

interface ProfessionPageProps {
  params: Promise<{ slug: string }>;
}

interface Practitioner {
  id: string;
  title: string;
  locationCity?: string;
  location_city?: string;
  ratingAvg?: number;
  rating_avg?: number;
  photoUrl?: string | null;
  photo_url?: string | null;
  slug?: string; // Peut être undefined, on utilisera un fallback
}

export default function ProfessionPage({ params }: ProfessionPageProps) {
  const [professionData, setProfessionData] = useState<any>(null);
  const [professionSlug, setProfessionSlug] = useState<string>('');
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getParams = async () => {
      try {
        const resolvedParams = await params;
        const slug = resolvedParams.slug;
        setProfessionSlug(slug); // Stocker le slug dans l'état

        // Récupérer les données de la profession depuis l'API
        const professionRes = await fetch(`/api/professions?slug=${slug}`);
        if (!professionRes.ok) {
          router.push('/404');
          return;
        }
        const profession = await professionRes.json();

        if (!profession || profession.error) {
          router.push('/404');
          return;
        }

        // Récupérer les 6 meilleurs praticiens pour cette profession (triés par rating)
        const practitionersRes = await fetch(`/api/practitioners?professionId=${profession.id}&limit=6&sortBy=rating`);
        const practitionersData = await practitionersRes.json();
        
        // Récupérer les données complètes de la profession depuis le mapping
        const professionMapping = {
          "naturopathe": { description: "Le logiciel tout-en-un pour les naturopathes, conçu pour optimiser vos consultations et la gestion de votre cabinet.", benefits: ["Gestion complète des anamnèses personnalisées", "Suivi des cures et recommandations nutritionnelles", "Facturation automatisée pour vos consultations", "Agenda intelligent avec rappels automatiques"] },
          "sophrologue": { description: "La plateforme idéale pour les sophrologues, facilitant la gestion des séances et le suivi thérapeutique.", benefits: ["Organisation des protocoles de relaxation", "Suivi personnalisé des objectifs thérapeutiques", "Gestion des séances individuelles et collectives", "Outils de visualisation et méditation guidée"] },
          "hypnotherapeute": { description: "L'outil complet pour les hypnothérapeutes, optimisant vos séances et la gestion administrative.", benefits: ["Gestion des inductions et protocoles hypnotiques", "Suivi des objectifs thérapeutiques personnalisés", "Enregistrement des séances pour réécoute", "Facturation adaptée aux thérapies longues"] },
          "osteopathe": { description: "Le logiciel spécialisé pour les ostéopathes, facilitant la prise de rendez-vous et la gestion documentaire.", benefits: ["Gestion des motifs de consultation ostéopathiques", "Suivi des manipulations et techniques utilisées", "Facturation spécifique aux actes ostéopathiques", "Agenda adapté aux consultations longues"] },
          "reflexologue": { description: "La solution complète pour les réflexologues, optimisant vos séances et votre suivi client.", benefits: ["Cartes des zones réflexes intégrées", "Suivi des protocoles de réflexologie plantaire/palmaire", "Gestion des séances de drainage lymphatique", "Facturation adaptée aux soins énergétiques"] },
          "kinesitherapeute": { description: "Le logiciel indispensable pour les kinésithérapeutes, facilitant la rééducation et le suivi patient.", benefits: ["Programmes de rééducation personnalisés", "Suivi des exercices et progrès patients", "Facturation des actes de kinésithérapie", "Gestion des protocoles post-opératoires"] },
          "psychologue": { description: "La plateforme sécurisée pour les psychologues, respectant le secret professionnel et facilitant le suivi.", benefits: ["Suivi thérapeutique confidentiel et sécurisé", "Gestion des notes de séance cryptées", "Facturation adaptée aux consultations longues", "Agenda intelligent avec créneaux flexibles"] },
          "coach-bien-etre": { description: "L'outil complet pour les coaches bien-être, optimisant vos accompagnements et votre gestion client.", benefits: ["Planification d'objectifs personnalisés", "Suivi des progrès et motivation client", "Gestion des programmes de coaching", "Facturation flexible des séances"] },
          "acupuncteur": { description: "Le logiciel spécialisé pour les acupuncteurs, facilitant la gestion des méridiens et points d'acupuncture.", benefits: ["Atlas des points d'acupuncture intégrés", "Suivi des méridiens et équilibre énergétique", "Gestion des protocoles de MTC", "Facturation des soins d'acupuncture"] },
          "magnetiseur": { description: "La plateforme adaptée aux magnétiseurs, facilitant la gestion des soins énergétiques.", benefits: ["Suivi des soins de magnétisme curatif", "Gestion des protocoles énergétiques", "Historique des zones traitées", "Facturation des soins de bien-être"] },
          "praticien-reiki": { description: "L'outil idéal pour les praticiens Reiki, optimisant vos soins énergétiques et votre gestion.", benefits: ["Suivi des niveaux Reiki (1er, 2ème, Maître)", "Gestion des initiations et harmonisations", "Historique des soins Reiki prodigués", "Facturation des séances énergétiques"] },
          "therapeute": { description: "La solution complète pour tous les thérapeutes, adaptée à vos besoins spécifiques.", benefits: ["Outils de suivi thérapeutique personnalisables", "Gestion documentaire complète", "Facturation flexible adaptée", "Agenda intelligent et intuitif"] }
        };

        const mappingData = professionMapping[slug] || professionMapping.therapeute;

        setProfessionData({
          ...profession,
          slug: slug, // Stocker aussi le slug dans professionData comme fallback
          icon: professionIcons[slug],
          content: professionContent[slug] || professionContent.therapeute,
          description: profession.description || mappingData.description,
          benefits: mappingData.benefits,
        });
        // S'assurer que tous les praticiens ont un slug valide
        const practitionersWithSlug = (practitionersData.practitioners || []).map((p: any) => ({
          ...p,
          slug: p.slug || `practitioner-${p.id}`,
        }));
        setPractitioners(practitionersWithSlug);
        setLoading(false);

        // Mise à jour du titre de la page
        document.title = `Trouvez un ${profession.name} de confiance | Holia`;
      } catch (error) {
        console.error('Error loading profession:', error);
        router.push('/404');
      }
    };

    getParams();
  }, [params, router]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!professionData || !professionSlug) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Profession non trouvée</h1>
          <p className="text-slate-600 mb-8">Cette profession n'est pas disponible sur Holia.</p>
          <Link href="/" className="bg-[#9bb49b] hover:bg-[#8aa483] text-white px-6 py-3 rounded-xl">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const Icon = professionData.icon;
  const content = professionData.content;

  // Navigation Précédent/Suivant
  const currentIndex = professionsOrder.indexOf(professionSlug || professionData?.slug || '');
  const previousSlug = currentIndex > 0 
    ? professionsOrder[currentIndex - 1] 
    : professionsOrder[professionsOrder.length - 1]; // Boucle : dernier -> premier
  const nextSlug = currentIndex < professionsOrder.length - 1 
    ? professionsOrder[currentIndex + 1] 
    : professionsOrder[0]; // Boucle : premier -> dernier
  
  // Récupérer les noms complets des professions
  const getProfessionName = (slug: string) => {
    const names: Record<string, string> = {
      "naturopathe": "Naturopathe",
      "sophrologue": "Sophrologue",
      "hypnotherapeute": "Hypnothérapeute",
      "osteopathe": "Ostéopathe",
      "reflexologue": "Réflexologue",
      "kinesitherapeute": "Kinésithérapeute",
      "psychologue": "Psychologue",
      "coach-bien-etre": "Coach Bien-être",
      "acupuncteur": "Acupuncteur",
      "magnetiseur": "Magnétiseur",
      "praticien-reiki": "Praticien Reiki",
      "therapeute": "Thérapeute",
    };
    return names[slug] || slug;
  };

  const previousProfession = professionIcons[previousSlug] 
    ? { slug: previousSlug, name: getProfessionName(previousSlug), icon: professionIcons[previousSlug] }
    : null;
  const nextProfession = professionIcons[nextSlug]
    ? { slug: nextSlug, name: getProfessionName(nextSlug), icon: professionIcons[nextSlug] }
    : null;

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section - Split Screen */}
      <section className="min-h-[100vh] w-full">
        <div className="mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[100vh]">
            {/* Content - Left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-white flex flex-col justify-center px-6 lg:px-12 py-12 lg:py-0"
            >
              {/* Icon */}
              {Icon && (
                <div className="mb-6">
                  <div className="w-20 h-20 bg-[#9bb49b]/10 rounded-full flex items-center justify-center">
                    <Icon className="h-10 w-10 text-[#9bb49b]" />
                  </div>
                </div>
              )}
              {/* Title */}
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Trouvez un {professionData.name} de confiance
              </h1>

              {/* Description */}
              <p className="text-xl text-slate-600 leading-relaxed mb-8">
                {content.heroDescription}
              </p>

              {/* CTA Button */}
              <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa483] text-white text-lg px-8 py-6 rounded-xl font-medium transition-all transform hover:scale-105 w-fit">
                <Link href={`/recherche?professionId=${professionData.id}`}>
                  Trouver un {professionData.name.toLowerCase()}
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>

            {/* Visual - Right */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="hidden lg:block relative"
            >
              <div className="relative w-full h-full">
                {(professionSlug || professionData?.slug) && (
                  <Image
                    src={`/images/professions/${(professionSlug || professionData?.slug) === 'praticien-reiki' ? 'reiki' : (professionSlug || professionData?.slug)}-hero.webp`}
                    alt={heroImageAlts[professionSlug || professionData?.slug] || `${professionData.name} - Holia`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 0vw, 50vw"
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SEO Content - Patient */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          {/* C'est quoi un [Profession] ? */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              C'est quoi un {professionData.name.toLowerCase()} ?
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              {content.definition}
            </p>
          </motion.div>

          {/* Quand consulter ? */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Quand consulter ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.when.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-[#9bb49b] flex-shrink-0 mt-1" />
                  <p className="text-lg text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Les bénéfices */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Les bénéfices de {professionDisciplineNames[professionSlug] || `la ${professionData.name.toLowerCase()}`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.benefits.map((benefit, index) => (
                <div key={index} className="bg-[#F9FAF9] rounded-2xl p-6 border border-slate-100">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-[#9bb49b] flex-shrink-0 mt-1" />
                    <p className="text-lg text-slate-700 font-medium">{benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof - Praticiens recommandés */}
      {practitioners.length > 0 && (
        <section className="py-20 bg-[#F9FAF9]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                {professionData.name}s recommandés
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Découvrez les praticiens les mieux notés en France
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {practitioners.map((practitioner, index) => (
                <motion.div
                  key={practitioner.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={`/praticien/${practitioner.slug}`}>
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-all cursor-pointer h-full">
                      <div className="flex items-start space-x-4 mb-4">
                        {(practitioner.photo_url || practitioner.photoUrl) ? (
                          <Image
                            src={(practitioner.photo_url || practitioner.photoUrl)!}
                            alt={practitioner.title}
                            width={64}
                            height={64}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-[#9bb49b]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="h-8 w-8 text-[#9bb49b]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate">
                            {practitioner.title}
                          </h3>
                          <div className="flex items-center text-slate-600 text-sm">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{practitioner.location_city || practitioner.locationCity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => {
                            const rating = practitioner.rating_avg || practitioner.ratingAvg || 0;
                            return (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(rating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <span className="ml-2 text-slate-600 text-sm">
                          {(practitioner.rating_avg || practitioner.ratingAvg) ? (practitioner.rating_avg || practitioner.ratingAvg)!.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa483] text-white px-8 py-6 rounded-xl font-medium">
                <Link href={`/recherche?professionId=${professionData.id}`}>
                  Voir tous les {professionData.name.toLowerCase()}s
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Conversion Pro (B2B) */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-white rounded-3xl p-12 border border-slate-200 shadow-lg"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[#9bb49b]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon className="h-10 w-10 text-[#9bb49b]" />
              </div>
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Holia pour les {professionData.name}s
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
                {professionData.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {professionData.benefits?.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-[#9bb49b] flex-shrink-0 mt-1" />
                  <p className="text-slate-700">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button asChild className="bg-[#9bb49b] hover:bg-[#8aa483] text-white text-lg px-10 py-6 rounded-xl font-medium transition-all transform hover:scale-105">
                <Link href={`/inscription?role=practitioner&job=${encodeURIComponent(professionData.name)}`}>
                  Démarrer avec Holia
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Questions fréquentes sur {professionDisciplineNames[professionSlug] || `la ${professionData.name.toLowerCase()}`}
            </h2>
            {professionFAQ[professionSlug] && professionFAQ[professionSlug].length > 0 ? (
              <FAQAccordion items={professionFAQ[professionSlug]} />
            ) : (
              <p className="text-slate-600">Aucune question fréquente disponible pour cette profession.</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Navigation Précédent/Suivant */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-slate-200">
            {/* Précédent */}
            {previousProfession && (
              <Link 
                href={`/profession/${previousProfession.slug}`}
                className="group relative p-8 md:p-12 bg-white hover:bg-slate-50 transition-colors border-r border-slate-200 md:border-r-0 md:border-b border-b-0"
              >
                {/* Icône en fond */}
                <div className="absolute right-8 top-8 opacity-10 pointer-events-none">
                  {React.createElement(previousProfession.icon, { className: "h-32 w-32 text-slate-400" })}
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-3">Profession précédente</p>
                    <div className="flex items-center gap-3">
                      {React.createElement(previousProfession.icon, { className: "h-6 w-6 text-[#9bb49b] flex-shrink-0" })}
                      <h3 className="text-2xl font-bold text-slate-900">{previousProfession.name}</h3>
                    </div>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:text-[#9bb49b] transition-colors flex-shrink-0 ml-4" />
                </div>
              </Link>
            )}

            {/* Suivant */}
            {nextProfession && (
              <Link 
                href={`/profession/${nextProfession.slug}`}
                className="group relative p-8 md:p-12 bg-white hover:bg-slate-50 transition-colors"
              >
                {/* Icône en fond */}
                <div className="absolute left-8 top-8 opacity-10 pointer-events-none">
                  {React.createElement(nextProfession.icon, { className: "h-32 w-32 text-slate-400" })}
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#9bb49b] transition-colors flex-shrink-0 mr-4" />
                  <div className="flex-1 text-right">
                    <p className="text-sm text-slate-500 mb-3">Profession suivante</p>
                    <div className="flex items-center justify-end gap-3">
                      <h3 className="text-2xl font-bold text-slate-900">{nextProfession.name}</h3>
                      {React.createElement(nextProfession.icon, { className: "h-6 w-6 text-[#9bb49b] flex-shrink-0" })}
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

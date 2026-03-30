"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Search } from "lucide-react";

interface RemboursementHeroProps {
  professions: ComboboxOption[];
  mutuelles: ComboboxOption[];
}

export function RemboursementHero({ professions, mutuelles }: RemboursementHeroProps) {
  const router = useRouter();
  const [selectedProfession, setSelectedProfession] = useState("");
  const [selectedMutuelle, setSelectedMutuelle] = useState("");

  const handleVerifier = () => {
    if (!selectedMutuelle || !selectedProfession) return;
    router.push(`/remboursement/${selectedMutuelle}/${selectedProfession}`);
  };

  const canVerify = selectedProfession && selectedMutuelle;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full max-w-2xl">
      <Combobox
        options={professions}
        value={selectedProfession}
        onValueChange={setSelectedProfession}
        placeholder="Choisir un métier"
        emptyText="Aucun métier trouvé"
        className="flex-1 min-w-0"
        buttonClassName="w-full"
      />
      <Combobox
        options={mutuelles}
        value={selectedMutuelle}
        onValueChange={setSelectedMutuelle}
        placeholder="Choisir une mutuelle"
        emptyText="Aucune mutuelle trouvée"
        className="flex-1 min-w-0"
        buttonClassName="w-full"
      />
      <button
        type="button"
        onClick={handleVerifier}
        disabled={!canVerify}
        className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-semibold text-white bg-[#9bb49b] hover:bg-[#8aa58a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <Search className="h-5 w-5" />
        Vérifier
      </button>
    </div>
  );
}

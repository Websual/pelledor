"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";

export interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200">
      {items.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="bg-white transition-colors hover:bg-slate-50/50"
          >
            <button
              type="button"
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between gap-4 py-5 px-6 text-left"
              aria-expanded={isOpen}
            >
              <h3 className="text-slate-800 font-medium pr-4 m-0 text-base sm:text-lg">
                {faq.question}
              </h3>
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#9bb49b]/10 flex items-center justify-center text-[#9bb49b]">
                {isOpen ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </span>
            </button>
            <motion.div
              initial={false}
              animate={{
                height: isOpen ? "auto" : 0,
                opacity: isOpen ? 1 : 0,
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="text-slate-600 text-base leading-relaxed pb-5 px-6 pt-4 border-t border-slate-100 mt-0">
                {typeof faq.answer === "string" ? (
                  <p className="m-0">{faq.answer}</p>
                ) : (
                  faq.answer
                )}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

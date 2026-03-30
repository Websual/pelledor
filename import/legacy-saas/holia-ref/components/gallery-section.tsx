"use client";

import { Building2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { GalleryModal } from "./gallery-modal";

interface GallerySectionProps {
  images: string[];
}

export function GallerySection({ images }: GallerySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const handleOpenGallery = () => {
    setInitialIndex(0);
    setIsModalOpen(true);
  };

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="flex gap-4">
        {/* Large photo */}
        <button
          type="button"
          onClick={() => {
            setInitialIndex(0);
            setIsModalOpen(true);
          }}
          className="relative w-2/3 aspect-[4/3] rounded-2xl border border-sable overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Image
            src={images[0]}
            alt="Photo principale du cabinet"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
        </button>
        
        {/* Two miniatures */}
        <div className="flex-1 flex flex-col gap-4">
          {/* First miniature */}
          {images[1] && (
            <button
              type="button"
              onClick={() => {
                setInitialIndex(1);
                setIsModalOpen(true);
              }}
              className="relative flex-1 rounded-2xl border border-sable overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Image
                src={images[1]}
                alt="Photo du cabinet"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </button>
          )}
          
          {/* "Voir les X photos" button */}
          {images.length > 2 && (
            <button
              type="button"
              onClick={handleOpenGallery}
              className="relative flex-1 rounded-2xl border border-sable overflow-hidden bg-sauge/5 hover:bg-sauge/10 transition-colors flex items-center justify-center"
            >
              <div className="text-center">
                <Building2 className="h-8 w-8 text-sauge/60 mx-auto mb-2" />
                <p className="text-sm font-medium text-anthracite">
                  Voir les {images.length} photos
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      <GalleryModal
        images={images}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialIndex={initialIndex}
      />
    </>
  );
}


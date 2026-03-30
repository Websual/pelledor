"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Quote = {
  id: string;
  clientName: string;
  description: string;
  status: string;
  signedAt: string | null;
};

export default function SignerDevisPage() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    fetch(`/api/modules/artisan-quotes/quote-requests?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.quote) {
          setQuote(d.quote);
          if (d.quote.signedAt) setSigned(true);
        }
        setLoading(false);
      });
  }, [token]);

  // Canvas drawing
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    e.preventDefault();
  }

  function stopDraw() {
    isDrawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSign() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    setError("");
    const res = await fetch("/api/modules/artisan-quotes/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, signatureData }),
    });
    const data = await res.json();
    if (data.ok) setSigned(true);
    else setError(data.error ?? "Erreur lors de la signature");
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
      </div>
    );

  if (!quote)
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">Devis introuvable ou lien invalide.</p>
      </div>
    );

  if (signed)
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">Devis signé !</h1>
          <p className="text-gray-600">
            Votre signature a été enregistrée. L'artisan a été notifié et reviendra vers vous rapidement.
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold mb-1">Signature de devis</h1>
        <p className="text-gray-500 text-sm mb-6">Bonjour {quote.clientName}, veuillez relire et signer ci-dessous.</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-1">Description des travaux :</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.description}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Votre signature :</p>
          <canvas
            ref={canvasRef}
            width={500}
            height={160}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-white touch-none cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          <button onClick={clearCanvas} className="text-xs text-gray-400 underline mt-1">
            Effacer
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSign}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition"
        >
          ✍️ Je signe et accepte le devis
        </button>

        <p className="text-xs text-gray-400 mt-3 text-center">
          En signant, vous acceptez les termes du devis. Cette signature a valeur contractuelle.
        </p>
      </div>
    </div>
  );
}

// 🔷 pages/index.tsx — Tron Grid Background with Animation
import { useRouter } from "next/router";
import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/id/${code.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 space-y-8 tron-grid animate-grid">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={200}
        height={80}
        className="mb-4"
      />
      <h1 className="text-4xl font-bold text-cyan-400">Digital Identity Access</h1>
      <p className="text-cyan-300">Enter your unique code below</p>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="NFC Code (e.g. abc123)"
          className="w-full px-4 py-2 rounded border-2 border-cyan-400 bg-black text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded"
        >
          Go
        </button>
      </form>
      <p className="text-sm text-cyan-500">Powered by TLDz.com</p>
      <style jsx>{`
        @keyframes gridScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 50px;
          }
        }
        .tron-grid {
          background-image: linear-gradient(#00f0ff 1px, transparent 1px), linear-gradient(90deg, #00f0ff 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .animate-grid {
          animation: gridScroll 4s linear infinite;
        }
      `}</style>
    </div>
  );
}

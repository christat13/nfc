// 🔷 pages/index.tsx — Tron Grid Background with Perspective and Animation
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
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 space-y-8 tron-grid animate-grid">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={200}
        height={80}
        className="mb-4"
      />
      <h1 className="text-4xl font-bold text-cyan-400">Power Your Digital Identity</h1>
      <p className="text-cyan-300">Claim your digital identity below</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const safeCode = code.trim().toLowerCase().replace(/[^a-z0-9]/gi, "");
          if (safeCode) {
            router.push(`/id/${safeCode}`);
          }
        }}
        className="space-y-4 w-full max-w-sm z-10"
      >
        <input
          type="text"
          placeholder="Your name (e.g. Flynn)"
          className="w-full px-4 py-2 rounded border-2 border-cyan-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded"
        >
          Claim
        </button>
      </form>
      <p className="text-sm text-cyan-500 z-10"><a href="https://tldz.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Powered by TLDz.com</a></p>
      <p className="text-xs text-cyan-300 mt-2 z-10 glowing-tagline">More than a dot</p>
      <style jsx>{`
        @keyframes gridScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100px;
          }
        }
        .tron-grid {
          position: relative;
          overflow: hidden;
        }
        .tron-grid::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image:
            repeating-linear-gradient(#00f0ff 0 2px, transparent 2px 40px),
            repeating-linear-gradient(90deg, #00f0ff 0 2px, transparent 2px 40px);
          transform: rotateX(60deg) scaleY(1.5) translateY(-25%);
          transform-origin: bottom;
          animation: gridScroll 12s linear infinite;
          opacity: 0.2;
          /* mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
          /* -webkit-mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
          z-index: 0;
        }
        .animate-grid {
          position: relative;
          z-index: 1;
        }
            `}</style>
      <style jsx>{`
        .glowing-tagline {
          text-shadow: 0 0 4px #0ff, 0 0 10px #0ff;
        }
      `}</style>
    </div>
  );
}


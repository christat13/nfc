import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

export default function Home() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    router.push(`/id/${username.toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 space-y-8 tron-grid animate-grid text-center">
      <Image src="/logo.png" alt="TLDz Logo" width={120} height={50} />
      <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">Power Your Digital Identity</h1>
      <p className="text-base text-cyan-600">Take Control of Your Digital Identity</p>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="Your name (e.g. Flynn)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 rounded border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-center"
        />
        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 px-4 rounded"
        >
          Claim
        </button>
      </form>

      <p className="text-sm text-cyan-400">Powered by TLDz.com</p>
      <p className="text-xs text-cyan-400 glowing-tagline">More Than a Dot</p>

      <style jsx>{`
        @keyframes gridScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 120px;
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
            repeating-linear-gradient(#00f0ff 0 2px, transparent 2px 100px),
            repeating-linear-gradient(90deg, #00f0ff 0 2px, transparent 2px 100px);
          transform: rotateX(70deg) scaleY(1.2) translateY(-20%);
          transform-origin: bottom;
          animation: gridScroll 10s linear infinite;
          opacity: 0.1;
          z-index: 0;
        }

        .animate-grid {
          position: relative;
          z-index: 1;
        }

        .glowing-tagline {
          text-shadow: 0 0 4px #00f0ff, 0 0 8px #00f0ff;
        }
      `}</style>
    </div>
  );
}

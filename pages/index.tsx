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
    <div className="min-h-screen bg-black text-cyan-300 flex flex-col items-center justify-center p-6 space-y-8">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={200}
        height={80}
        className="mb-4"
      />
      <h1 className="text-4xl font-bold neon-text">Digital Identity Access</h1>
      <p className="text-cyan-400">Enter your unique code below</p>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="NFC Code (e.g. abc123)"
          className="w-full px-4 py-2 rounded bg-black border border-cyan-500 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded"
        >
          Go
        </button>
      </form>
      <p className="text-sm text-cyan-700">Powered by TLDz.com</p>
      <style jsx>{`
        .neon-text {
          text-shadow: 0 0 5px #0ff, 0 0 10px #0ff, 0 0 20px #0ff;
        }
      `}</style>
    </div>
  );
}

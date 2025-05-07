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
    <div className="min-h-screen bg-white text-gray-800 flex flex-col items-center justify-center p-6 space-y-8 grid-bg">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={200}
        height={80}
        className="mb-4"
      />
      <h1 className="text-4xl font-bold text-blue-500">Digital Identity Access</h1>
      <p className="text-blue-400">Enter your unique code below</p>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="NFC Code (e.g. abc123)"
          className="w-full px-4 py-2 rounded border-2 border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Go
        </button>
      </form>
      <p className="text-sm text-blue-500">Powered by TLDz.com</p>
      <style jsx>{`
        .grid-bg {
          background-image: linear-gradient(to right, #ccf3ff 1px, transparent 1px),
                            linear-gradient(to bottom, #ccf3ff 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}

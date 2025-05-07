import { useRouter } from "next/router";
import { useState } from "react";

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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold">🔗 Digital Identity Access</h1>
        <p className="text-gray-400">Enter your code below to view your profile</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter your NFC code"
            className="w-full px-4 py-2 rounded text-black"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 py-2 px-4 rounded font-bold"
          >
            Go
          </button>
        </form>

        <p className="text-sm text-gray-500">Powered by TLDz.com</p>
      </div>
    </div>
  );
}

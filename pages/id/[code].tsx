// 🔷 pages/id/[code].tsx — Tron Grid Profile View with Animation
import { useRouter } from "next/router";
import Image from "next/image";

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 space-y-6 tron-grid animate-grid">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={180}
        height={70}
        className="mb-4"
      />
      <h1 className="text-3xl font-bold text-cyan-400">NFC Profile Code</h1>
      <p className="text-xl bg-cyan-800 px-4 py-2 rounded shadow">{code}</p>
      <p className="text-sm text-cyan-300">Scan, claim, or share your profile</p>
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


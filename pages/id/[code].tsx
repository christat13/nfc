// 🔷 pages/id/[code].tsx — Tron Grid Profile View with Perspective and Animation
import { useRouter } from "next/router";
import Image from "next/image";

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 space-y-6 tron-grid animate-grid">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={180}
        height={70}
        className="mb-4"
      />
      <h1 className="text-3xl font-bold text-cyan-400">NFC Profile Code</h1>
      <p className="text-xl bg-blue-100 px-4 py-2 rounded shadow z-10">{code}</p>
      <p className="text-sm text-cyan-300 z-10">Scan, claim, or share your profile</p>
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
          animation: gridScroll 6s linear infinite;
          opacity: 0.2;
          z-index: 0;
        }
        .animate-grid {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}



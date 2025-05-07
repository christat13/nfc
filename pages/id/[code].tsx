import { useRouter } from "next/router";
import Image from "next/image";

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  return (
    <div className="min-h-screen bg-black text-cyan-300 flex flex-col items-center justify-center p-6 space-y-6">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={180}
        height={70}
        className="mb-4"
      />
      <h1 className="text-3xl font-bold neon-text">NFC Profile Code</h1>
      <p className="text-xl bg-cyan-800 px-4 py-2 rounded shadow-lg">{code}</p>
      <p className="text-sm text-cyan-700">Scan, claim, or share your profile</p>
      <style jsx>{`
        .neon-text {
          text-shadow: 0 0 5px #0ff, 0 0 10px #0ff, 0 0 20px #0ff;
        }
      `}</style>
    </div>
  );
}


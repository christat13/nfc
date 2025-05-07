import { useRouter } from "next/router";
import Image from "next/image";

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col items-center justify-center p-6 space-y-6 grid-bg">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={180}
        height={70}
        className="mb-4"
      />
      <h1 className="text-3xl font-bold text-blue-500">NFC Profile Code</h1>
      <p className="text-xl bg-blue-100 px-4 py-2 rounded shadow">{code}</p>
      <p className="text-sm text-blue-400">Scan, claim, or share your profile</p>
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



import { useRouter } from "next/router";
import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { QRCode } from "react-qrcode-logo";

interface ProfileData {
  name: string;
  title: string;
  email: string;
  linkedin: string;
  website: string;
  photoURL?: string;
}

export default function ProfilePreview() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (code && typeof code === "string") {
        const docRef = doc(db, "profiles", code);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ProfileData;
          setProfile(data);

          // Auto-download vCard on mobile load
          if (/Mobi|Android/i.test(navigator.userAgent)) {
            downloadVCard(data);
          }
        }
      }
    };
    fetchProfile();
  }, [code]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadVCard = (data: ProfileData) => {
    const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${data.name}
TITLE:${data.title}
EMAIL:${data.email}
URL:${data.website}
URL:${data.linkedin}
END:VCARD
    `.trim();

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.name.replace(/\s+/g, "_")}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!profile) return <p className="text-center mt-10">Loading profile...</p>;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-4 py-8 space-y-6 tron-grid animate-grid">
    <Image
      src={
        profile.photoURL?.trim()
          ? profile.photoURL
          : "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f60a.svg"
      }
      alt="Profile"
      width={96}
      height={96}
      className="rounded-full border-2 border-cyan-400"
    />

      <h1 className="text-3xl font-bold text-cyan-400">{profile.name}</h1>
      <p className="text-lg text-cyan-600">{profile.title}</p>
      <div className="text-center space-y-2">
        <p>Email: <a href={`mailto:${profile.email}`} className="text-blue-600 underline">{profile.email}</a></p>
        <p>LinkedIn: <a href={profile.linkedin} target="_blank" className="text-blue-600 underline">{profile.linkedin}</a></p>
        <p>Website: <a href={profile.website} target="_blank" className="text-blue-600 underline">{profile.website}</a></p>
      </div>

      <div className="flex flex-col items-center gap-3 pt-4">
        <QRCode value={window.location.href} size={128} />
        <button onClick={copyToClipboard} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded">
          {copied ? "Link Copied!" : "Copy Link"}
        </button>
        <button onClick={() => downloadVCard(profile)} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded">
          Download Contact
        </button>
        <button onClick={() => router.push(`/id/${code}`)} className="px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-white rounded">
          Edit Profile
        </button>
      </div>

      <Image src="/logo.png" alt="TLDz Logo" width={100} height={40} className="mt-6" />

      <p className="text-xs text-cyan-400 mt-4">
        More Than a Dot • Powered by <a href="https://tldz.com" className="underline">TLDz.com</a>
      </p>
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
    opacity: 0.15;
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


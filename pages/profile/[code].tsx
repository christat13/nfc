// 🔷 pages/profile/[code].tsx — Digital Business Card Preview with QR and Share
import { useRouter } from "next/router";
import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { QRCode } from "react-qrcode-logo";

// ✅ Type definition for profile data
interface ProfileData {
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
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
          setProfile(docSnap.data() as ProfileData);
        }
      }
    };
    fetchProfile();
  }, [code]);

  const copyToClipboard = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadVCard = () => {
    if (!profile) return;

    const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${profile.name}
TITLE:${profile.title}
EMAIL:${profile.email}
TEL:${profile.phone}
URL:${profile.website}
URL:${profile.linkedin}
END:VCARD
    `.trim();

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile.name.replace(/\s+/g, "_")}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!profile) return <p className="text-center mt-10">Loading profile...</p>;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 space-y-6 tron-grid animate-grid">
      <Image src="/logo.png" alt="TLDz Logo" width={80} height={30} />
      <h1 className="text-3xl font-bold text-cyan-400">{profile.name}</h1>
      <p className="text-lg text-cyan-600">{profile.title}</p>
      <div className="text-center space-y-2">
        <p>Email: <a href={`mailto:${profile.email}`} className="text-blue-600 underline">{profile.email}</a></p>
        <p>Phone: <a href={`tel:${profile.phone}`} className="text-blue-600 underline">{profile.phone}</a></p>
        <p>LinkedIn: <a href={profile.linkedin} target="_blank" className="text-blue-600 underline">{profile.linkedin}</a></p>
        <p>Website: <a href={profile.website} target="_blank" className="text-blue-600 underline">{profile.website}</a></p>
      </div>

      <div className="flex flex-col items-center gap-3 pt-4">
        <QRCode value={typeof window !== 'undefined' ? window.location.href : ''} size={128} />
        <button
          onClick={copyToClipboard}
          className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded"
        >
          {copied ? "Link Copied!" : "Copy Link"}
        </button>
        <button
          onClick={downloadVCard}
          className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded"
        >
          Download Contact
        </button>
      </div>

      <p className="text-xs text-cyan-400 mt-4">
        More than a dot • Powered by <a href="https://tldz.com" className="underline">TLDz.com</a>
      </p>
    </div>
  );
}

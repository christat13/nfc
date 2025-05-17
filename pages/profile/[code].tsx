// FILE: /pages/profile/[code].tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { QRCode } from "react-qrcode-logo";

interface ProfileData {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  phone: string;
  website: string;
  linkedin: string;
  photoURL?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code || typeof code !== "string") return;

    const fetchProfile = async () => {
      const ref = doc(db, "profiles", code);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data() as ProfileData);
        if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
          setTimeout(() => handleDownloadVCard(snap.data() as ProfileData), 1000);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [code]);

  const handleDownloadVCard = (data: ProfileData) => {
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${data.lastName};${data.firstName};;;`,
      `FN:${fullName}`,
      `TITLE:${data.title}`,
      `ORG:${data.company}`,
      `TEL;TYPE=CELL:${data.phone}`,
      `URL:${data.website}`,
      `URL:${data.linkedin}`,
      "END:VCARD"
    ];

    const blob = new Blob([lines.join("\r\n")], { type: "text/vcard" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fullName}.vcf`;
    link.click();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p className="p-4">Loading profile...</p>;
  if (!profile) return <p className="p-4">Profile not found.</p>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-4 tron-grid animate-grid p-6">
      <Image
        src={profile.photoURL?.trim() || "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f60a.svg"}
        alt="Profile"
        width={96}
        height={96}
        className="rounded-full border-2 border-cyan-400"
      />

      <h1 className="text-3xl font-bold text-cyan-400">{profile.firstName} {profile.lastName}</h1>
      <p className="text-lg text-white">{profile.title} at {profile.company}</p>
      <p className="text-white">Phone: {profile.phone}</p>

      <div className="text-center space-y-2">
        <p className="text-white">Website: <a href={profile.website} target="_blank" className="underline text-blue-400">{profile.website}</a></p>
        <p className="text-white">LinkedIn: <a href={profile.linkedin} target="_blank" className="underline text-blue-400">{profile.linkedin}</a></p>
      </div>

      <div className="flex flex-col items-center gap-3 pt-4">
        <QRCode value={window.location.href} size={128} />
        <button onClick={copyToClipboard} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded">
          {copied ? "Link Copied!" : "Copy Link"}
        </button>
        <button onClick={() => handleDownloadVCard(profile)} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded">
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
    </div>
  );
}
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Image from "next/image";
import logo from "@/public/logo.png";
import { FaGlobe, FaLinkedin, FaTwitter, FaInstagram } from "react-icons/fa";

const QRCode = dynamic(() => import("react-qrcode-logo").then((mod) => mod.QRCode), { ssr: false });

export default function PublicProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<any>(null);
  const [fullURL, setFullURL] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFullURL(window.location.href);
    }
  }, [code]);

  useEffect(() => {
    if (!code || typeof code !== "string") return;

    const fetchProfile = async () => {
      const ref = doc(db, "profiles", code);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        router.push(`/id/${code}`);
        return;
      }

      setProfile(snap.data());

      await updateDoc(ref, {
        viewedAt: serverTimestamp(),
      });
    };

    fetchProfile();
  }, [code]);

  const downloadVCard = () => {
    if (!profile) return;
    const { name, email, phone, org, title } = profile;
    const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${name}
EMAIL:${email || ""}
TEL:${phone || ""}
ORG:${org || ""}
TITLE:${title || ""}
URL:${fullURL}
END:VCARD
    `.trim();

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullURL);
    toast.success("Link copied!");
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-white text-tldzPurple flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-tldzGray rounded-2xl p-6 shadow-lg border border-tldzPurple">
        <h1 className="text-xl font-bold mb-4 text-tldzRed">🌐 Digital Business Card</h1>

        <p><strong>Code:</strong> {code}</p>
        <p><strong>Name:</strong> {profile.name || "—"}</p>
        {profile.title && <p><strong>Title:</strong> {profile.title}</p>}
        {profile.org && <p><strong>Org:</strong> {profile.org}</p>}
        {profile.email && <p><strong>Email:</strong> {profile.email}</p>}
        {profile.phone && <p><strong>Phone:</strong> {profile.phone}</p>}

        {profile.website && (
          <p className="mt-2"><FaGlobe className="inline mr-1 text-tldzBlue" /> <a href={profile.website} className="underline" target="_blank">Website</a></p>
        )}
        {profile.linkedin && (
          <p className="mt-2"><FaLinkedin className="inline mr-1 text-tldzBlue" /> <a href={profile.linkedin} className="underline" target="_blank">LinkedIn</a></p>
        )}
        {profile.twitter && (
          <p className="mt-2"><FaTwitter className="inline mr-1 text-tldzBlue" /> <a href={profile.twitter} className="underline" target="_blank">Twitter</a></p>
        )}
        {profile.instagram && (
          <p className="mt-2"><FaInstagram className="inline mr-1 text-tldzBlue" /> <a href={profile.instagram} className="underline" target="_blank">Instagram</a></p>
        )}

        <p className="mt-4 text-sm break-words text-tldzPurple">{fullURL}</p>

        {fullURL && (
          <div className="mt-4 flex flex-col items-center">
            <QRCode value={fullURL} size={128} logoImage={logo.src} logoWidth={24} />
          </div>
        )}

        <div className="mt-6 grid gap-3">
          <button
            onClick={downloadVCard}
            className="bg-tldzRed hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            📥 Download vCard
          </button>
          <button
            onClick={copyToClipboard}
            className="bg-tldzBlue hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            🔗 Copy Link
          </button>
        </div>

        {(profile.photo || profile.file || profile.info) && (
          <div className="mt-6 space-y-2">
            {profile.photo && (
              <div>
                <p className="text-sm text-tldzPurple">Photo:</p>
                <img src={profile.photo} alt="Profile" className="rounded w-full" />
              </div>
            )}
            {profile.file && (
              <div>
                <p className="text-sm text-tldzPurple">File:</p>
                <a href={profile.file} target="_blank" rel="noopener noreferrer" className="text-tldzPurple underline">
                  View file
                </a>
              </div>
            )}
            {profile.info && (
              <div>
                <p className="text-sm text-tldzPurple">Info:</p>
                <a href={profile.info} target="_blank" rel="noopener noreferrer" className="text-tldzPurple underline">
                  View info
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Image from "next/image";
import logo from "@/public/logo.png";
import {
  FaGlobe,
  FaLinkedin,
  FaTwitter,
  FaInstagram,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";

const QRCode = dynamic(
  () => import("react-qrcode-logo").then((mod) => mod.QRCode),
  { ssr: false }
);

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

      // ✅ Track profile view
      await updateDoc(ref, {
        viewedAt: serverTimestamp(),
        views: increment(1),
      }).catch((err) => console.warn("View tracking failed:", err));
    };

    fetchProfile();
  }, [code]);

  const downloadVCard = (platform: "ios" | "android") => {
    if (!profile) return;
    const { name, email, phone, org, title, website, linkedin, twitter, instagram } = profile;
    const noteLines = [
      website ? `Website: ${website}` : null,
      linkedin ? `LinkedIn: ${linkedin}` : null,
      twitter ? `Twitter: ${twitter}` : null,
      instagram ? `Instagram: ${instagram}` : null,
    ].filter(Boolean).join("\\n");

    const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${name}
EMAIL:${email || ""}
TEL:${phone || ""}
ORG:${org || ""}
TITLE:${title || ""}
URL:${fullURL}
NOTE:${noteLines}
END:VCARD
    `.trim();

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}-${platform}.vcf`;
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
      <div className="max-w-md w-full bg-tldzGray rounded-2xl p-6 shadow-lg border border-tldzPurple text-center">
        {profile.photo && (
          <div className="flex justify-center mb-4">
            <img
              src={profile.photo}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border border-tldzPurple"
            />
          </div>
        )}

        <p className="text-lg font-semibold">{profile.name || "—"}</p>
        {profile.title && <p>{profile.title}</p>}
        {profile.org && <p>{profile.org}</p>}

        {profile.email && (
          <p className="mt-2">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 text-tldzBlue underline"
            >
              <FaEnvelope /> {profile.email}
            </a>
          </p>
        )}
        {profile.phone && (
          <p className="mt-2">
            <a
              href={`tel:${profile.phone}`}
              className="inline-flex items-center gap-2 text-tldzBlue underline"
            >
              <FaPhone /> {profile.phone}
            </a>
          </p>
        )}
        {profile.website && (
          <p className="mt-2">
            <FaGlobe className="inline mr-1 text-tldzBlue" />{" "}
            <a href={profile.website} className="underline" target="_blank">
              Website
            </a>
          </p>
        )}
        {profile.linkedin && (
          <p className="mt-2">
            <FaLinkedin className="inline mr-1 text-tldzBlue" />{" "}
            <a href={profile.linkedin} className="underline" target="_blank">
              LinkedIn
            </a>
          </p>
        )}
        {profile.twitter && (
          <p className="mt-2">
            <FaTwitter className="inline mr-1 text-tldzBlue" />{" "}
            <a href={profile.twitter} className="underline" target="_blank">
              Twitter
            </a>
          </p>
        )}
        {profile.instagram && (
          <p className="mt-2">
            <FaInstagram className="inline mr-1 text-tldzBlue" />{" "}
            <a href={profile.instagram} className="underline" target="_blank">
              Instagram
            </a>
          </p>
        )}

        <p className="mt-4 text-sm break-words text-tldzPurple">{fullURL}</p>

        {fullURL && (
          <div className="mt-4 flex flex-col items-center">
            <QRCode
              value={fullURL}
              size={128}
              logoImage={logo.src}
              logoWidth={24}
            />
          </div>
        )}

        <div className="mt-6 grid gap-3">
          <button
            onClick={() => downloadVCard("ios")}
            className="bg-tldzRed hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            📱 iPhone vCard
          </button>
          <button
            onClick={() => downloadVCard("android")}
            className="bg-tldzBlue hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            🤖 Android vCard
          </button>
          <button
            onClick={copyToClipboard}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded"
          >
            🔗 Copy Link
          </button>
        </div>

        {(profile.file || profile.info) && (
          <div className="mt-6 space-y-2 text-left">
            {profile.file && (
              <div>
                <p className="text-sm text-tldzPurple">File:</p>
                <a
                  href={profile.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tldzPurple underline"
                >
                  View file
                </a>
              </div>
            )}
            {profile.info && (
              <div>
                <p className="text-sm text-tldzPurple">Info:</p>
                <a
                  href={profile.info}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tldzPurple underline"
                >
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
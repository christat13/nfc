import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// @ts-ignore
import QRCode from "qrcode.react";

export default function PublicProfile() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    const fetchProfile = async () => {
      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          toast.error("Profile not found.");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile.");
      }
    };

    fetchProfile();
  }, [router.isReady, code]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-600 bg-white">
        Loading profile...
      </div>
    );
  }

  const {
    firstName,
    lastName,
    title,
    company,
    email,
    website,
    phone,
    linkedin,
    photoURL,
  } = profile;

  const displayName = `${firstName || ""} ${lastName || ""}`.trim();
  const fullURL = typeof window !== "undefined" ? window.location.href : "";

  const downloadVCard = () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${displayName}`,
      title ? `TITLE:${title}` : "",
      company ? `ORG:${company}` : "",
      email ? `EMAIL:${email}` : "",
      phone ? `TEL:${phone}` : "",
      website ? `URL:${website}` : "",
      linkedin ? `URL:${linkedin}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayName || "contact"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-gray-200 rounded-xl shadow-md p-6 text-center">
        {photoURL && (
          <img
            src={photoURL}
            alt="Profile Photo"
            className="w-24 h-24 rounded-full mx-auto mb-4 border"
          />
        )}

        <h1 className="text-2xl font-bold text-gray-800 mb-1">{displayName}</h1>
        {title && <p className="text-gray-600">{title}</p>}
        {company && <p className="text-gray-500 mb-4">{company}</p>}

        <div className="space-y-1 text-sm mb-6">
          {email && (
            <p>
              <a href={`mailto:${email}`} className="text-blue-600 underline">
                {email}
              </a>
            </p>
          )}
          {website && (
            <p>
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                {website.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
          {phone && (
            <p>
              <a href={`tel:${phone}`} className="text-blue-600 underline">
                {phone}
              </a>
            </p>
          )}
          {linkedin && (
            <p>
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                LinkedIn
              </a>
            </p>
          )}
        </div>

        <div className="bg-white p-2 w-fit mx-auto rounded mb-4 border">
          <QRCode value={fullURL} size={128} />
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(fullURL);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full mb-2"
        >
          {copied ? "✅ Link Copied" : "Copy Link"}
        </button>

        <button
          onClick={downloadVCard}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded w-full mb-2"
        >
          Download Contact
        </button>

        <button
          onClick={() => router.push(`/setup/${code}`)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}


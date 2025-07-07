import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
// @ts-ignore
import QRCode from "qrcode.react";

export default function PublicProfile() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [fullURL, setFullURL] = useState("");

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    const fetchProfile = async () => {
      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          // 👇 Auto-redirect to claim page if unclaimed
          if (!data.uid) {
            router.push(`/id/${code}`);
            return;
          }

          setProfile(data);
          await updateDoc(ref, { viewedAt: new Date().toISOString() });
        } else {
          toast.error("Profile not found.");
          router.push("/");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile.");
      }
    };

    fetchProfile();

    if (typeof window !== "undefined") {
      setFullURL(window.location.href);
    }
  }, [router.isReady, code]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-600 bg-white">
        Loading profile...
      </div>
    );
  }

  const { name, role, organization, email, phone, photo, info } = profile;

  const downloadVCard = () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name || ""}`,
      organization ? `ORG:${organization}` : "",
      role ? `TITLE:${role}` : "",
      email ? `EMAIL:${email}` : "",
      phone ? `TEL:${phone}` : "",
      photo ? `PHOTO;VALUE=URI:${photo}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "contact"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-gray-200 rounded-xl shadow-md p-6 text-center">
        {photo ? (
          <img
            src={photo}
            alt="Profile Photo"
            className="w-24 h-24 rounded-full mx-auto mb-4 border object-cover"
          />
        ) : (
          <div className="w-24 h-24 mx-auto mb-4 rounded-full border flex items-center justify-center text-sm text-gray-500 bg-gray-100">
            No Photo
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-800 mb-1">{name || "Unnamed"}</h1>
        {role && <p className="text-gray-600">{role}</p>}
        {organization && <p className="text-gray-500 mb-4">{organization}</p>}

        <div className="space-y-1 text-sm mb-6">
          {email && (
            <p>
              <a href={`mailto:${email}`} className="text-blue-600 underline">
                {email}
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
          {info && (
            <p>
              <a
                href={info}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View Info File
              </a>
            </p>
          )}
        </div>

        <div className="bg-white p-3 w-fit mx-auto rounded mb-4 border">
          <p className="text-xs text-gray-500 mb-1">Scan to share</p>
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
          onClick={() => router.push(`/id/${code}`)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}
// This code displays a public profile page for NFC pins, allowing users to view their profile information,
// download a vCard, copy the profile link, and edit their profile if they are the owner. It uses QR codes for easy sharing and updates the profile's viewed timestamp in Firestore when accessed.
// It also handles cases where the profile is unclaimed by redirecting to the edit page.
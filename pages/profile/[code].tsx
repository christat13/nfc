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
  const [fileMeta, setFileMeta] = useState<{ size?: number; type?: string }>({});

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    const fetchProfile = async () => {
      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          if (!data.uid) {
            router.push(`/id/${code}`);
            return;
          }

          setProfile(data);
          await updateDoc(ref, { viewedAt: new Date().toISOString() });

          if (data.info) {
            try {
              const res = await fetch(data.info, { method: "HEAD" });
              setFileMeta({
                size: res.headers.get("content-length")
                  ? parseInt(res.headers.get("content-length")!)
                  : undefined,
                type: res.headers.get("content-type") || "",
              });
            } catch (metaErr) {
              console.warn("Could not load file metadata", metaErr);
            }
          }
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

  if (!router.isReady || !code || typeof code !== "string") {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-600 bg-white">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-600 bg-white">
        Loading profile...
      </div>
    );
  }

  const { name, role, organization, email, phone, photo, info, coolLink } = profile;

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

  const extractFileName = (url: string) => {
    try {
      return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "info");
    } catch {
      return "info";
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1c2030] to-[#0a0f1a] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-tldz-purple rounded-2xl shadow-xl p-6 text-center bg-[#121827] backdrop-blur-md">
        <div className="flex justify-center mb-4">
          {photo ? (
            <img
              src={photo}
              alt="Profile Photo"
              className="w-24 h-24 rounded-full border object-cover border-tldz-blue shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-24 h-24 rounded-full border border-tldz-blue flex items-center justify-center text-sm text-gray-300 bg-tldz-gray">
              No Photo
            </div>
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-tldz-red mb-1 tracking-tight">
          {name || "Unnamed"}
        </h1>
        {role && <p className="text-tldz-gray italic">{role}</p>}
        {organization && <p className="text-tldz-gray mb-4">{organization}</p>}

        <div className="space-y-2 text-sm mb-6">
          {email && (
            <p>
              <a href={`mailto:${email}`} className="text-tldz-blue underline">
                {email}
              </a>
            </p>
          )}
          {phone && (
            <p>
              <a href={`tel:${phone}`} className="text-tldz-blue underline">
                {phone}
              </a>
            </p>
          )}
          {info && typeof info === "string" && (
            <div className="flex flex-col items-center mt-2">
              <span className="text-tldz-gray text-xs mb-1">Info File</span>
              <a
                href={info}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-gray-200 text-tldz-blue px-4 py-2 rounded text-sm max-w-full truncate shadow"
                title={extractFileName(info)}
              >
                📄 {extractFileName(info)}
              </a>
              <div className="text-xs text-tldz-gray mt-1">
                {fileMeta.type && (
                  <span className="inline-block bg-tldz-purple px-2 py-0.5 rounded mr-2">
                    {fileMeta.type}
                  </span>
                )}
                {formatBytes(fileMeta.size)}
              </div>
            </div>
          )}
          {coolLink && typeof coolLink === "string" && (
            <p>
              <a
                href={coolLink.startsWith("http") ? coolLink : `https://${coolLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tldz-blue underline hover:text-blue-400 transition"
              >
                🌐 Visit Cool Link
              </a>
            </p>
          )}
        </div>

        {fullURL && (
          <div className="bg-white p-3 w-fit mx-auto rounded mb-4 border shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Scan to share</p>
            <QRCode value={fullURL} size={128} />
          </div>
        )}

        <button
          onClick={() => {
            navigator.clipboard.writeText(fullURL);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="bg-tldz-blue hover:bg-blue-600 text-white px-4 py-2 rounded w-full mb-2 font-semibold transition"
        >
          {copied ? "✅ Link Copied" : "Copy Link"}
        </button>

        <button
          onClick={downloadVCard}
          className="bg-tldz-gray hover:bg-gray-400 text-black px-4 py-2 rounded w-full mb-2 font-semibold transition"
        >
          Download Contact
        </button>

        <button
          onClick={() => router.push(`/id/${code}`)}
          className="bg-tldz-red hover:bg-red-600 text-white px-4 py-2 rounded w-full font-semibold transition"
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
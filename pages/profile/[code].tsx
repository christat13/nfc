// /pages/profile/[code].tsx
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
import { getAuth, onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import {
  FaGlobe,
  FaLinkedin,
  FaTwitter,
  FaInstagram,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";

export default function PublicProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<any>(null);
  const [fullURL, setFullURL] = useState("");
  const [canEdit, setCanEdit] = useState(false);

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

      // Increment views and log timestamp
      await updateDoc(ref, {
        viewedAt: serverTimestamp(),
        views: increment(1),
      }).catch((err) => console.warn("View tracking failed:", err));
    };

    fetchProfile();
  }, [code]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && profile?.owner && user.uid === profile.owner) {
        setCanEdit(true);
      }
    });
    return () => unsubscribe();
  }, [profile]);

  const downloadVCard = async (platform: "ios" | "android") => {
    if (!profile) return;
    const { name, email, phone, org, title, website, linkedin, twitter, instagram } = profile;

    const noteLines = [
      website ? `Website: ${website}` : null,
      linkedin ? `LinkedIn: ${linkedin}` : null,
      twitter ? `Twitter: ${twitter}` : null,
      instagram ? `Instagram: ${instagram}` : null,
    ].filter(Boolean).join("\n");

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

    try {
      const ref = doc(db, "profiles", code as string);
      await updateDoc(ref, {
        downloads: increment(1),
      });
    } catch (err) {
      console.warn("Download tracking failed:", err);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullURL);
    toast.success("Link copied!");
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-100 rounded-2xl p-6 shadow-lg border border-purple-600 text-center">
        <div className="flex justify-center mb-4">
          {profile.photo ? (
            <img
              src={profile.photo}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border border-purple-600"
            />
          ) : (
            <div className="w-24 h-24 flex items-center justify-center rounded-full border text-3xl bg-white">
              🙂
            </div>
          )}
        </div>

        <p className="text-lg font-semibold text-purple-800">{profile.name || "—"}</p>
        {profile.title && <p className="text-gray-700">{profile.title}</p>}
        {profile.org && <p className="text-gray-700">{profile.org}</p>}

        {profile.email && (
          <p className="mt-2">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 text-red-600 underline"
            >
              <FaEnvelope /> {profile.email}
            </a>
          </p>
        )}
        {profile.phone && (
          <p className="mt-2">
            <a
              href={`tel:${profile.phone}`}
              className="inline-flex items-center gap-2 text-red-600 underline"
            >
              <FaPhone /> {profile.phone}
            </a>
          </p>
        )}
        {profile.website && (
          <p className="mt-2">
            <FaGlobe className="inline mr-1 text-purple-800" />{" "}
            <a href={profile.website} className="underline text-purple-800" target="_blank">
              Website
            </a>
          </p>
        )}
        {profile.linkedin && (
          <p className="mt-2">
            <FaLinkedin className="inline mr-1 text-purple-800" />{" "}
            <a href={profile.linkedin} className="underline text-purple-800" target="_blank">
              LinkedIn
            </a>
          </p>
        )}
        {profile.twitter && (
          <p className="mt-2">
            <FaTwitter className="inline mr-1 text-purple-800" />{" "}
            <a href={profile.twitter} className="underline text-purple-800" target="_blank">
              Twitter
            </a>
          </p>
        )}
        {profile.instagram && (
          <p className="mt-2">
            <FaInstagram className="inline mr-1 text-purple-800" />{" "}
            <a href={profile.instagram} className="underline text-purple-800" target="_blank">
              Instagram
            </a>
          </p>
        )}

        <p className="mt-4 text-sm break-words text-black">{fullURL}</p>

        <div className="mt-6 grid gap-3">
          <button
            onClick={() => downloadVCard("ios")}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            📱 iPhone vCard
          </button>
          <button
            onClick={() => downloadVCard("android")}
            className="bg-purple-700 hover:bg-purple-800 text-white py-2 px-4 rounded"
          >
            🤖 Android vCard
          </button>
          <button
            onClick={copyToClipboard}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded"
          >
            🔗 Copy Link
          </button>
          {canEdit && (
            <button
              onClick={() => router.push(`/id/${code}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {(profile.file || profile.info) && (
          <div className="mt-6 space-y-2 text-left">
            {profile.file && (
              <div>
                <p className="text-sm font-semibold text-purple-700">File:</p>
                <a
                  href={profile.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-700 underline"
                >
                  View file
                </a>
              </div>
            )}
            {profile.info && (
              <div>
                <p className="text-sm font-semibold text-purple-700">Info:</p>
                <a
                  href={profile.info}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-700 underline"
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

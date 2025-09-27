// /pages/profile/[code].tsx
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import { FaGlobe, FaLinkedin, FaTwitter, FaInstagram, FaEnvelope, FaPhone } from "react-icons/fa";

export default function PublicProfilePage() {
  const router = useRouter();
  const rawCode = router.query.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

  const [profile, setProfile] = useState<any>(null);
  const [fullURL, setFullURL] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const viewedOnce = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") setFullURL(window.location.href);
  }, [code]);

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    const fetchProfile = async () => {
      const ref = doc(db, "profiles", code);
      const snap = await getDoc(ref);

      if (!snap.exists() || !snap.data()?.claimed) {
        router.push(`/id/${code}`);
        return;
      }
      const data = snap.data();
      setProfile(data);

      if (!viewedOnce.current) {
        viewedOnce.current = true;
        await updateDoc(ref, { viewedAt: serverTimestamp(), views: increment(1) }).catch(() => {});
      }
    };

    fetchProfile();
  }, [router.isReady, code, router]);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setCanEdit(!!user && !!profile?.uid && user.uid === profile.uid);
    });
    return () => unsub();
  }, [profile]);

  const downloadVCard = async (platform: "ios" | "android") => {
    if (!profile) return;
    const { firstName, lastName, email, phone, org, company, title, website, linkedin, twitter, instagram } = profile;
    const orgSafe = org || company || "";

    const noteLines = [
      website ? `Website: ${website}` : null,
      linkedin ? `LinkedIn: ${linkedin}` : null,
      twitter ? `Twitter: ${twitter}` : null,
      instagram ? `Instagram: ${instagram}` : null,
    ].filter(Boolean).join("\n");

    const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${lastName || ""};${firstName || ""}
FN:${[firstName, lastName].filter(Boolean).join(" ")}
EMAIL:${email || ""}
TEL:${phone || ""}
ORG:${orgSafe}
TITLE:${title || ""}
URL:${fullURL}
NOTE:${noteLines}
END:VCARD`.trim();

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${code}-${platform}.vcf`; a.click();
    URL.revokeObjectURL(url);

    try { await updateDoc(doc(db, "profiles", code as string), { downloads: increment(1) }); } catch {}
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullURL);
    toast.success("Link copied!");
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-100 rounded-2xl p-6 shadow-lg border border-blue-600 text-center">
        <div className="flex justify-center mb-4">
          {profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-blue-600" />
          ) : (
            <div className="w-24 h-24 flex items-center justify-center rounded-full border text-3xl bg-white">🙂</div>
          )}
        </div>

        <p className="text-lg font-semibold text-blue-800">
          {profile.firstName || "—"} {profile.lastName || ""}
        </p>
        {profile.title && <p className="text-gray-700">{profile.title}</p>}
        {(profile.org || profile.company) && <p className="text-gray-700">{profile.org || profile.company}</p>}

        {profile.email && (
          <p className="mt-2">
            <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 text-blue-600 underline">
              <FaEnvelope /> {profile.email}
            </a>
          </p>
        )}
        {profile.phone && (
          <p className="mt-2">
            <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-2 text-blue-600 underline">
              <FaPhone /> {profile.phone}
            </a>
          </p>
        )}
        {profile.website && (
          <p className="mt-2">
            <FaGlobe className="inline mr-1 text-blue-800" />{" "}
            <a href={profile.website} className="underline text-blue-800" target="_blank" rel="noopener noreferrer">
              Website
            </a>
          </p>
        )}
        {profile.linkedin && (
          <p className="mt-2">
            <FaLinkedin className="inline mr-1 text-blue-800" />{" "}
            <a href={profile.linkedin} className="underline text-blue-800" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </p>
        )}
        {profile.twitter && (
          <p className="mt-2">
            <FaTwitter className="inline mr-1 text-blue-800" />{" "}
            <a href={profile.twitter} className="underline text-blue-800" target="_blank" rel="noopener noreferrer">
              Twitter
            </a>
          </p>
        )}
        {profile.instagram && (
          <p className="mt-2">
            <FaInstagram className="inline mr-1 text-blue-800" />{" "}
            <a href={profile.instagram} className="underline text-blue-800" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </p>
        )}

        <p className="mt-4 text-sm break-words text-black">{fullURL}</p>

        <div className="mt-6 grid gap-3">
          <button onClick={() => downloadVCard("ios")} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
            📱 iPhone vCard
          </button>
          <button onClick={() => downloadVCard("android")} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
            🤖 Android vCard
          </button>
          <button onClick={copyToClipboard} className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded">
            🔗 Copy Link
          </button>
          {canEdit && (
            <button onClick={() => router.push(`/id/${code}`)} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {(profile.fileShare1 || profile.fileShare2 || profile.info) && (
          <div className="mt-6 space-y-3 text-left">
            {profile.fileShare1 && (
              <div>
                <p className="text-sm font-semibold text-blue-700">File to Share</p>
                <a href={profile.fileShare1} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                  {profile.fileShare1Name || "View file"}
                </a>
              </div>
            )}
            {profile.fileShare2 && (
              <div>
                <p className="text-sm font-semibold text-blue-700">File to Share</p>
                <a href={profile.fileShare2} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                  {profile.fileShare2Name || "View file"}
                </a>
              </div>
            )}
            {profile.info && (
              <div>
                <p className="text-sm font-semibold text-blue-700">File to Share</p>
                <a href={profile.info} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                  {profile.infoName || "View file"}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

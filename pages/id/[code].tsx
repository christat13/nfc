import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db, storage } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

// Dynamically import QR code component
const QRCode = dynamic(() =>
  import("react-qrcode-logo").then((mod) => mod.QRCode),
  { ssr: false }
);

export default function EditProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  const [profile, setProfile] = useState<any>({
    name: "",
    title: "",
    org: "",
    email: "",
    phone: "",
    photo: "",
    file: "",
    info: "",
  });

  const [fullURL, setFullURL] = useState("");
  const [isDark, setIsDark] = useState(true);

  // Set profile URL for QR code
  useEffect(() => {
    if (typeof window !== "undefined") {
      setFullURL(window.location.href.replace("/id/", "/profile/"));
    }
  }, [code]);

  // Load existing profile
  useEffect(() => {
    if (!code || typeof code !== "string") return;
    const load = async () => {
      const ref = doc(db, "profiles", code);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data());
      }
    };
    load();
  }, [code]);

  const saveProfile = async () => {
    if (!code || typeof code !== "string") return;
    const ref = doc(db, "profiles", code);
    await setDoc(ref, {
      ...profile,
      updatedAt: serverTimestamp(),
    });
    toast.success("Profile saved!");
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!code || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const storageRef = ref(storage, `profiles/${code}/${field}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    setProfile((prev: any) => ({ ...prev, [field]: url }));
    toast.success(`${field} uploaded!`);
  };

  const printCard = () => window.print();
  const toggleMode = () => setIsDark(!isDark);

  return (
    <div className={isDark ? "bg-black text-white min-h-screen p-6" : "bg-white text-black min-h-screen p-6"}>
      <div className="flex justify-between mb-6">
        <button onClick={toggleMode} className="border px-4 py-1 rounded text-sm">
          {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
        <button onClick={printCard} className="border px-4 py-1 rounded text-sm">
          🖨️ Print Card
        </button>
      </div>

      <div className="max-w-md mx-auto bg-gray-100 dark:bg-gray-900 rounded-2xl p-6 shadow border border-tldzBlue">
        <h1 className="text-xl font-bold mb-4 text-tldzPurple">✏️ Edit Your Digital Card</h1>

        <div className="grid gap-3">
          {["name", "title", "org", "email", "phone"].map((field) => (
            <input
              key={field}
              type="text"
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              className="p-2 border rounded bg-white text-black"
              value={profile[field]}
              onChange={(e) =>
                setProfile({ ...profile, [field]: e.target.value })
              }
            />
          ))}

          <div>
            <p className="text-sm text-gray-400">Photo (Image Upload):</p>
            <input type="file" accept="image/*" onChange={(e) => uploadFile(e, "photo")} />
            {profile.photo && <img src={profile.photo} alt="Uploaded" className="mt-2 rounded w-full" />}
          </div>

          <div>
            <p className="text-sm text-gray-400">File Upload:</p>
            <input type="file" onChange={(e) => uploadFile(e, "file")} />
            {profile.file && (
              <a href={profile.file} target="_blank" className="text-blue-400 underline mt-1 block">View uploaded file</a>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-400">Info Upload:</p>
            <input type="file" onChange={(e) => uploadFile(e, "info")} />
            {profile.info && (
              <a href={profile.info} target="_blank" className="text-blue-400 underline mt-1 block">View info</a>
            )}
          </div>
        </div>

        <button
          onClick={saveProfile}
          className="bg-tldzPurple hover:bg-tldzBlue text-white py-2 px-4 mt-4 rounded w-full"
        >
          💾 Save Profile
        </button>

        <div className="mt-6 flex justify-center">
          {fullURL && (
            <QRCode
              value={fullURL}
              size={128}
              logoImage="/logo-tldz.png"
              logoWidth={32}
              logoHeight={32}
              removeQrCodeBehindLogo
            />
          )}
        </div>

        <p className="mt-4 text-center text-sm break-words text-tldzGray">{fullURL}</p>
      </div>
    </div>
  );
}


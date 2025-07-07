// pages/id/[code].tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
import { app } from "@/lib/firebase";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Image from "next/image";
import logo from "@/public/logo.png";
import { FaLinkedin, FaGlobe, FaPhone, FaEnvelope, FaTwitter, FaInstagram } from "react-icons/fa";

const QRCode = dynamic(() => import("react-qrcode-logo").then(mod => mod.QRCode), { ssr: false });

export default function EditProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<any>({});
  const [fullURL, setFullURL] = useState("");
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<"dark" | "light">("dark");

  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFullURL(window.location.href.replace("/id/", "/profile/"));
    }
  }, [code]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!code || typeof code !== "string") return;

    const fetchProfile = async () => {
      const docRef = doc(db, "profiles", code as string);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };
    fetchProfile();
  }, [code]);

  const handleFileUpload = async (e: any, field: string) => {
    if (!code) return;
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const fileRef = ref(storage, `uploads/${code}/${field}.${ext}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    setProfile((prev: any) => ({ ...prev, [field]: url }));
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").substring(0, 10);
    const match = digits.match(/(\d{3})(\d{3})(\d{4})/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
  };

  const saveProfile = async () => {
    if (!code || !user) return;
    if (!profile.name || !profile.email) {
      toast.error("Name and email are required.");
      return;
    }
    const docRef = doc(db, "profiles", code as string);
    await setDoc(
      docRef,
      {
        ...profile,
        uid: user.uid,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    toast.success("Profile saved!");
  };

  const isOwner = user?.uid && (!profile.uid || profile.uid === user.uid);

  return (
    <div className={`${mode === "dark" ? "bg-black text-white" : "bg-white text-black"} min-h-screen p-4 sm:p-6`}>
      <button
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        className="border px-3 py-1 rounded mb-4"
      >
        {mode === "dark" ? "🌞 Light Mode" : "🌙 Dark Mode"}
      </button>

      {isOwner ? (
        <div className="max-w-md mx-auto bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
          <h1 className="text-xl font-bold mb-4 text-tldzRed">📝 Edit Your Digital Card</h1>

          <label className="block text-sm mb-1 font-medium">Name *</label>
          <input className="input mb-2 w-full" placeholder="Name" value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />

          <label className="block text-sm mb-1 font-medium">Title</label>
          <input className="input mb-2 w-full" placeholder="Title" value={profile.title || ""} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />

          <label className="block text-sm mb-1 font-medium">Org</label>
          <input className="input mb-2 w-full" placeholder="Org" value={profile.org || ""} onChange={(e) => setProfile({ ...profile, org: e.target.value })} />

          <label className="block text-sm mb-1 font-medium">Email *</label>
          <input className="input mb-2 w-full" placeholder="Email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />

          <label className="block text-sm mb-1 font-medium">Phone</label>
          <input className="input mb-2 w-full" placeholder="Phone" value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })} />

          <label className="block text-sm mb-1 font-medium">Website</label>
          <div className="flex items-center gap-2 mb-2">
            <FaGlobe className="text-tldzBlue" />
            <input className="input w-full" placeholder="https://yourwebsite.com" value={profile.website || ""} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
          </div>

          <label className="block text-sm mb-1 font-medium">LinkedIn</label>
          <div className="flex items-center gap-2 mb-2">
            <FaLinkedin className="text-tldzBlue" />
            <input className="input w-full" placeholder="https://linkedin.com/in/yourprofile" value={profile.linkedin || ""} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} />
          </div>

          <label className="block text-sm mb-1 font-medium">Twitter</label>
          <div className="flex items-center gap-2 mb-2">
            <FaTwitter className="text-tldzBlue" />
            <input className="input w-full" placeholder="https://twitter.com/yourhandle" value={profile.twitter || ""} onChange={(e) => setProfile({ ...profile, twitter: e.target.value })} />
          </div>

          <label className="block text-sm mb-1 font-medium">Instagram</label>
          <div className="flex items-center gap-2 mb-2">
            <FaInstagram className="text-tldzBlue" />
            <input className="input w-full" placeholder="https://instagram.com/yourhandle" value={profile.instagram || ""} onChange={(e) => setProfile({ ...profile, instagram: e.target.value })} />
          </div>

          <div className="mb-3">
            <label className="text-sm block">Photo (Image Upload):</label>
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "photo")} />
            {profile.photo && <img src={profile.photo} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded" />}
          </div>

          <div className="mb-3">
            <label className="text-sm block">File Upload:</label>
            <input type="file" onChange={(e) => handleFileUpload(e, "file")} />
            {profile.file && (
              <a href={profile.file} className="text-blue-600 underline text-sm mt-1 block" target="_blank" rel="noreferrer">
                📄 View Uploaded File
              </a>
            )}
          </div>

          <div className="mb-3">
            <label className="text-sm block">Info Upload:</label>
            <input type="file" onChange={(e) => handleFileUpload(e, "info")} />
            {profile.info && (
              <a href={profile.info} className="text-blue-600 underline text-sm mt-1 block" target="_blank" rel="noreferrer">
                🗂️ View Info Document
              </a>
            )}
          </div>

          <button
            onClick={saveProfile}
            className="mt-4 bg-tldzRed hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            💾 Save Profile
          </button>

          <div className="mt-6 flex flex-col items-center">
            {fullURL && (
              <QRCode
                value={fullURL}
                size={128}
                logoImage={logo.src}
                logoWidth={24}
              />
            )}
            <p className="text-xs mt-2 break-all text-center">{fullURL}</p>
            <button
              className="mt-2 text-sm underline text-blue-600"
              onClick={() => window.print()}
            >
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-red-500 font-semibold">
          You are not authorized to edit this profile.
        </div>
      )}
    </div>
  );
}


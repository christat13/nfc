import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
} from "firebase/storage";
import { app } from "@/lib/firebase";
import dynamic from "next/dynamic";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  FaLinkedin,
  FaGlobe,
  FaPhone,
  FaEnvelope,
  FaTwitter,
  FaInstagram,
} from "react-icons/fa";

const QRCode = dynamic(
  () => import("react-qrcode-logo").then((mod) => mod.QRCode),
  { ssr: false }
);

export default function EditProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const profileCode = typeof code === "string" ? code : "";
  const [profile, setProfile] = useState<any>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [fullURL, setFullURL] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [showViewButton, setShowViewButton] = useState(false);

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
    if (!profileCode) return;
    const fetchProfile = async () => {
      const docRef = doc(db, "profiles", profileCode);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
        setProfileExists(true);
      } else {
        setProfile({});
        setProfileExists(false);
      }
    };
    fetchProfile();
  }, [profileCode]);

  const isOwner = user?.uid && (!profile?.uid || profile?.uid === user?.uid);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (authMode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Signed up successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Signed in!");
      }
      setTimeout(() => {
        router.reload();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: any, field: string) => {
    if (!profileCode) return;
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const fileRef = ref(storage, `uploads/${profileCode}/${field}.${ext}`);
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
    if (!profileCode || !user) return;
    if (!profile.name || !profile.email) {
      toast.error("Name and email are required.");
      return;
    }
    const docRef = doc(db, "profiles", profileCode);
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
    setShowViewButton(true);
  };

  const renderAuthForm = () => (
    <div className="max-w-md mx-auto bg-white text-black p-6 rounded shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {authMode === "signin" ? "Sign In" : "Sign Up"} to Claim This Pin
      </h2>
      <input className="input w-full mb-3" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input w-full mb-3" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {authMode === "signup" && (
        <input className="input w-full mb-3" placeholder="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      )}
      <button
        onClick={handleAuth}
        className="bg-tldzBlue hover:bg-blue-700 text-white w-full py-2 rounded font-semibold"
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : authMode === "signin" ? "Sign In" : "Sign Up"}
      </button>
      <p className="mt-4 text-sm">
        {authMode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          className="underline text-tldzRed"
          onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
        >
          {authMode === "signin" ? "Sign Up" : "Sign In"}
        </button>
      </p>
    </div>
  );

  if (profileExists === null) {
    return (
      <div className="flex justify-center items-center h-screen text-xl">
        ⏳ Loading profile...
      </div>
    );
  }

  return (
    <div className="bg-white text-black min-h-screen p-4 sm:p-6">
      <Toaster />

      {!user || (profileExists && !isOwner)
        ? renderAuthForm()
        : profile && isOwner && (
            <div className="max-w-md mx-auto bg-gray-100 p-6 rounded-xl shadow-lg">
              <h1 className="text-xl font-bold mb-4 text-tldzRed">📝 Edit Your Digital Card</h1>

              <input className="input mb-2 w-full" placeholder="Name" value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              <input className="input mb-2 w-full" placeholder="Title" value={profile.title || ""} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
              <input className="input mb-2 w-full" placeholder="Org" value={profile.org || ""} onChange={(e) => setProfile({ ...profile, org: e.target.value })} />
              <input className="input mb-2 w-full" placeholder="Email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              <input className="input mb-2 w-full" placeholder="Phone" value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })} />
              <input className="input mb-2 w-full" placeholder="Website" value={profile.website || ""} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
              <input className="input mb-2 w-full" placeholder="LinkedIn" value={profile.linkedin || ""} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} />
              <input className="input mb-2 w-full" placeholder="Twitter" value={profile.twitter || ""} onChange={(e) => setProfile({ ...profile, twitter: e.target.value })} />
              <input className="input mb-2 w-full" placeholder="Instagram" value={profile.instagram || ""} onChange={(e) => setProfile({ ...profile, instagram: e.target.value })} />

              <div className="mb-3">
                <label className="text-sm block mb-1">Photo:</label>
                <button className="mb-1 px-4 py-2 bg-gray-200 rounded">Choose Photo</button>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "photo")} className="hidden" />
                {profile.photo && <img src={profile.photo} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded" />}
              </div>

              <div className="mb-3">
                <label className="text-sm block mb-1">File:</label>
                <button className="mb-1 px-4 py-2 bg-gray-200 rounded">Choose File</button>
                <input type="file" onChange={(e) => handleFileUpload(e, "file")} className="hidden" />
                {profile.file && <a href={profile.file} target="_blank" className="text-blue-600 underline">📄 View File</a>}
              </div>

              <div className="mb-3">
                <label className="text-sm block mb-1">Info:</label>
                <button className="mb-1 px-4 py-2 bg-gray-200 rounded">Choose Info</button>
                <input type="file" onChange={(e) => handleFileUpload(e, "info")} className="hidden" />
                {profile.info && <a href={profile.info} target="_blank" className="text-blue-600 underline">🗂️ View Info</a>}
              </div>

              <button onClick={saveProfile} className="mt-4 bg-tldzRed hover:bg-red-700 text-white px-4 py-2 rounded">
                💾 Save Profile
              </button>

              {showViewButton && (
                <button onClick={() => router.push(`/profile/${profileCode}`)} className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
                  🔗 View Your Profile
                </button>
              )}

              <div className="mt-6 flex flex-col items-center">
                {fullURL && <QRCode value={fullURL} size={128} />}
                <p className="text-xs mt-2 break-all text-center">{fullURL}</p>
                <button onClick={() => {
                  window.print();
                  const docRef = doc(db, "profiles", profileCode);
                  setDoc(docRef, { downloadCount: increment(1) }, { merge: true });
                }} className="mt-2 text-sm underline text-blue-600">
                  🖨️ Print / Save as PDF
                </button>
              </div>
            </div>
          )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db, auth, storage } from "@/lib/firebase";
import {
  doc as firestoreDoc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import toast, { Toaster } from "react-hot-toast";
import { QRCode as QRCodeComponent } from "react-qrcode-logo";

export default function EditProfilePage() {
  const router = useRouter();
  const { code, firstName } = router.query;
  const safeCode = Array.isArray(code) ? code[0] : code;
  const [profile, setProfile] = useState<any>({});
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showViewButton, setShowViewButton] = useState(false);
  const [fullURL, setFullURL] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!safeCode) return;
    const fetchProfile = async () => {
      const docRef = firestoreDoc(db, "profiles", safeCode);
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
  }, [safeCode]);

  const isOwner = user?.uid && (!profile?.uid || profile?.uid === user?.uid);

  const handleAuth = async () => {
    try {
      if (authMode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Signed up successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Signed in successfully!");
      }
      router.push(`/id/${safeCode}`);
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    }
  };

  const saveProfile = async () => {
    if (!safeCode || !user) return;
    if (!profile.name || !profile.email) {
      toast.error("Name and email are required.");
      return;
    }
    try {
      setSaving(true);
      const docRef = firestoreDoc(db, "profiles", safeCode);
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
      setTimeout(() => router.push(`/profile/${safeCode}`), 1500);
    } catch (err) {
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: any, field: string) => {
    if (!safeCode) return;
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const fileRef = ref(storage, `uploads/${safeCode}/${field}.${ext}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    setProfile((prev: any) => ({ ...prev, [field]: url }));
  };

  if (profileExists === null) return null;

  if (!user || (profileExists && !isOwner)) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-4 sm:p-6">
        <div className="bg-gray-100 rounded-xl p-6 shadow-md w-full max-w-md">
          <h1 className="text-xl font-bold text-purple-800 mb-4">
            {authMode === "signin" ? "Sign In" : "Sign Up"} to Claim This Profile
          </h1>
          <input className="input w-full mb-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input w-full mb-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {authMode === "signup" && (
            <input className="input w-full mb-2" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          )}
          <button onClick={handleAuth} className="bg-purple-700 text-white py-2 px-4 rounded w-full">
            {authMode === "signin" ? "Sign In" : "Sign Up"}
          </button>
          <p className="text-sm mt-3 text-center">
            {authMode === "signin" ? "Don't have an account?" : "Already have an account?"} {" "}
            <button onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")} className="text-red-600 underline">
              {authMode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4 sm:p-6">
      <Toaster />
      <div className="bg-gray-100 rounded-2xl p-6 shadow-lg border border-purple-600 w-full max-w-md sm:max-w-lg">
        <h1 className="text-xl font-bold text-red-600 mb-4">Welcome {firstName} – Let's Create Your Profile</h1>

        {["name", "title", "org", "email", "phone", "website", "linkedin", "twitter", "instagram"].map((key) => {
          const prefix = key === "linkedin" ? "https://linkedin.com/in/" :
                         key === "twitter" ? "https://twitter.com/" :
                         key === "instagram" ? "https://instagram.com/" : "";
          return (
            <div key={key} className="mb-3">
              <label className="text-sm font-semibold text-purple-800 block mb-1">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
              <div className="flex">
                {prefix && <span className="text-sm bg-gray-200 rounded-l px-2 py-2 border border-r-0 border-gray-300">{prefix}</span>}
                <input
                  className="input w-full bg-white border border-gray-300 px-3 py-2 rounded"
                  placeholder={`Enter ${key}`}
                  value={(profile?.[key] ?? "").replace(prefix, "")}
                  onChange={(e) => setProfile({ ...profile, [key]: prefix + e.target.value })}
                />
              </div>
            </div>
          );
        })}

        {["photo", "file", "info"].map((field) => (
          <div key={field} className="mb-4">
            <label className="text-sm font-semibold text-purple-800 block mb-1">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            <label className="inline-block bg-purple-50 text-purple-700 font-semibold px-4 py-2 rounded cursor-pointer border border-purple-300 hover:bg-purple-100">
              Choose File
              <input type="file" onChange={(e) => handleFileUpload(e, field)} className="hidden" />
            </label>
            {profile[field] && (
              field === "photo" ? (
                <img src={profile.photo} alt="Uploaded" className="mt-2 w-24 h-24 rounded object-cover border" />
              ) : (
                <a href={profile[field]} className="block mt-1 text-purple-700 underline" target="_blank" rel="noopener noreferrer">
                  View {field}
                </a>
              )
            )}
          </div>
        ))}

        <button
          onClick={saveProfile}
          disabled={saving}
          className={`${
            saving ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"
          } bg-red-600 text-white px-4 py-2 rounded w-full mb-3`}
        >
          💾 {saving ? "Saving..." : "Save Profile"}
        </button>

        {showViewButton && (
          <button
            onClick={() => router.push(`/profile/${safeCode}`)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded w-full"
          >
            🔗 View Your Profile
          </button>
        )}

        <div className="mt-6 text-center">
          <QRCodeComponent value={fullURL} size={128} />
          <p className="text-xs mt-2 break-all text-black">{fullURL}</p>
          <a
            href={`data:text/vcard;charset=utf-8,BEGIN:VCARD\nVERSION:3.0\nN:${profile.name || ""}\nEMAIL:${profile.email || ""}\nTEL:${profile.phone || ""}\nORG:${profile.org || ""}\nTITLE:${profile.title || ""}\nURL:${profile.website || ""}\nEND:VCARD`}
            download={`${profile.name || "profile"}.vcf`}
            className="mt-3 inline-block bg-purple-700 hover:bg-purple-800 text-white text-sm px-4 py-2 rounded"
          >
            📥 Download vCard
          </a>
        </div>
      </div>
    </div>
  );
}


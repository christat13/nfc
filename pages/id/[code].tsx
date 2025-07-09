// /pages/id/[code].tsx
import { sendPasswordResetEmail } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db, auth, storage } from "@/lib/firebase";
import {
  doc as firestoreDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import toast, { Toaster } from "react-hot-toast";

export default function EditProfilePage() {
  const router = useRouter();
  const { code, firstName } = router.query;
  const safeCode = Array.isArray(code) ? code[0] : code;

  const [profile, setProfile] = useState<any>({});
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

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
      setTimeout(() => router.reload(), 500);
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast.error("Please enter your email");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent!");
      setShowResetForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    }
  };

  const saveProfile = async () => {
    if (!safeCode || !user) return;

    const requiredFields = ["firstName", "lastName", "email"];
    const missingFields = requiredFields.filter((key) => !profile[key]);

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    try {
      setSaving(true);
      const docRef = firestoreDoc(db, "profiles", safeCode);

      if (profile.uid && profile.uid !== user.uid) {
        toast.error("You're not allowed to edit this profile.");
        return;
      }

      await setDoc(
        docRef,
        {
          ...profile,
          uid: user.uid,
          lastUpdated: serverTimestamp(),
          claimed: true,
          claimedAt: profile.claimedAt || serverTimestamp(),
          downloads: increment(0),
          views: increment(0),
        },
        { merge: true }
      );

      toast.success("Profile saved! Redirecting...");
      setTimeout(() => router.push(`/profile/${safeCode}`), 2000);
    } catch (err: any) {
      toast.error(err.message || "Error saving profile");
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
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress((prev) => ({ ...prev, [field]: progress }));
      },
      () => {
        toast.error("Upload failed");
        setUploadProgress((prev) => ({ ...prev, [field]: 0 }));
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setProfile((prev: any) => ({ ...prev, [field]: url }));
        setUploadProgress((prev) => ({ ...prev, [field]: 100 }));
      }
    );
  };

  if (profileExists === null) return null;

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4 sm:p-6">
      <Toaster />
      <div className="bg-gray-100 rounded-2xl p-6 shadow-lg border border-purple-600 w-full max-w-md sm:max-w-lg">
        <h1 className="text-xl font-bold text-red-600 mb-4">Welcome {firstName} – Let's Create Your Profile</h1>

        <div className="mb-4 text-center">
          <label className="block font-semibold mb-1">Photo (optional)</label>
          <input type="file" onChange={(e) => handleFileUpload(e, "photo")} />
          {uploadProgress.photo > 0 && uploadProgress.photo < 100 && (
            <p className="text-xs text-purple-700">Uploading: {Math.round(uploadProgress.photo)}%</p>
          )}
          {profile.photo ? (
            <img
              src={profile.photo}
              alt="Uploaded"
              className="mx-auto w-24 h-24 rounded-full object-cover border mt-2"
            />
          ) : (
            <div className="w-24 h-24 mx-auto flex items-center justify-center rounded-full border text-3xl bg-white mt-2">
              🙂
            </div>
          )}
        </div>

        {["firstName", "lastName", "title", "org", "email", "phone", "website", "linkedin", "twitter", "instagram"].map((field) => (
          <div key={field} className="mb-3">
            <label className="text-sm font-semibold block mb-1 capitalize">{field}</label>
            <input
              className="input w-full border border-gray-300 rounded px-3 py-2"
              placeholder={field}
              value={profile?.[field] || ""}
              onChange={(e) => setProfile({ ...profile, [field]: e.target.value })}
            />
          </div>
        ))}

        {["file", "info"].map((field) => (
          <div key={field} className="mb-4">
            <label className="block font-semibold mb-1 capitalize">{field} (optional)</label>
            <input type="file" onChange={(e) => handleFileUpload(e, field)} />
            {uploadProgress[field] > 0 && uploadProgress[field] < 100 && (
              <p className="text-xs text-purple-700">Uploading: {Math.round(uploadProgress[field])}%</p>
            )}
            {profile[field] && (
              <a href={profile[field]} target="_blank" className="text-sm underline text-purple-700 mt-1 block">
                View {field}
              </a>
            )}
          </div>
        ))}

        <button onClick={saveProfile} disabled={saving} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
          {saving ? "Saving..." : "💾 Save Profile"}
        </button>
      </div>
    </div>
  );
}

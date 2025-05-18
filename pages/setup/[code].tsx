import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth";
import toast from "react-hot-toast";

export default function SetupProfile() {
  const router = useRouter();
  const { code } = router.query;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    title: "",
    company: "",
    phone: "",
    website: "",
    linkedin: "",
    photoURL: "",
  });

  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    console.log("🚦 Setup page loaded with code:", code);
  }, [router.isReady, code]);

  const handleCreateProfile = async () => {
    if (!router.isReady || !code || typeof code !== "string") {
      toast.error("Invalid pin. Please scan again.");
      return;
    }

    toast("📲 Form triggered", { duration: 2000 });
    console.log("📥 Submit triggered with:", { email, password, code });

    if (!email) {
      toast.error("Email is required.");
      emailRef.current?.focus();
      return;
    }

    if (!password) {
      toast.error("Password is required.");
      passwordRef.current?.focus();
      return;
    }

    if (!confirmPassword) {
      toast.error("Please confirm your password.");
      confirmRef.current?.focus();
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      confirmRef.current?.focus();
      return;
    }

    setIsSaving(true);
    toast("🔄 Creating your account...", { duration: 3000 });

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      console.log("🟢 Firebase user created:", uid);
      toast.success("✅ Account created!");

      const newProfile = {
        ...profile,
        uid,
        email,
        created: serverTimestamp(),
      };

      toast("💾 Saving your profile...", { duration: 3000 });
      await setDoc(doc(db, "profiles", code), newProfile);
      console.log("🟢 Profile saved to Firestore");

      toast.success("✅ Profile saved! Redirecting...", { duration: 6000 });
      router.replace(`/profile/${code}`);
    } catch (err: any) {
      console.error("🔥 Error during setup:", err);

      if (err.code === "auth/email-already-in-use") {
        toast.error("That email is already registered. Try signing in.");
      } else if (err.code === "auth/weak-password") {
        toast.error("Password too weak. Use at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Invalid email address.");
      } else {
        toast.error(err.message || "Unexpected error. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !code || typeof code !== "string") return;

    try {
      const storagePath = `profile_photos/${code}`;
      const imgRef = storageRef(storage, storagePath);
      await uploadBytes(imgRef, file);
      const url = await getDownloadURL(imgRef);
      setProfile((p) => ({ ...p, photoURL: url }));
      console.log("🖼️ Photo uploaded:", url);
    } catch (err) {
      console.error("Photo upload error:", err);
      toast.error("Failed to upload photo.");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Claim Your NFC Pin</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        ref={emailRef}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full mb-3 p-2 border rounded"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        ref={passwordRef}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-3 p-2 border rounded"
      />

      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        ref={confirmRef}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setConfirmTouched(true);
        }}
        className={`w-full p-2 border rounded ${
          confirmTouched && !passwordsMatch ? "bg-yellow-100 mb-1" : "mb-4"
        }`}
      />
      {confirmTouched && !passwordsMatch && (
        <p className="text-sm text-red-600 mb-3">❌ Passwords do not match</p>
      )}

      <button
        onClick={() => fileInputRef.current?.click()}
        className="bg-sky-500 text-white px-4 py-2 rounded mb-4"
      >
        Upload Photo
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {Object.entries(profile).map(([field, value]) => {
        if (field === "photoURL") return null;

        return (
          <input
            key={field}
            placeholder={
              field === "linkedin"
                ? "LinkedIn Profile"
                : field === "website"
                ? "Website"
                : field[0].toUpperCase() + field.slice(1)
            }
            value={(value as string) || ""}
            onChange={(e) => {
              let val = e.target.value.toLowerCase();
              setProfile((p) => ({ ...p, [field]: val }));
            }}
            onBlur={(e) => {
              let val = e.target.value.toLowerCase();

              if (val && !val.startsWith("http://") && !val.startsWith("https://")) {
                val = "https://" + val;
              }

              if (field === "linkedin" && !val.includes("linkedin.com")) {
                toast.error("LinkedIn URL must include linkedin.com");
              }

              setProfile((p) => ({ ...p, [field]: val }));
            }}
            className="w-full mb-3 p-2 border rounded"
          />
        );
      })}

      <button
        onClick={handleCreateProfile}
        disabled={isSaving}
        className={`w-full px-4 py-2 rounded text-white ${
          isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-sky-500"
        }`}
      >
        {isSaving ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Saving...
          </span>
        ) : (
          "Create Profile"
        )}
      </button>
    </div>
  );
}

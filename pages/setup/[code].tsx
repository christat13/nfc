import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import toast from "react-hot-toast";

export default function SetupProfile() {
  const router = useRouter();
  const { code } = router.query;

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const handleCreateProfile = async () => {
    if (!router.isReady || !code || typeof code !== "string") {
      toast.error("Invalid code.");
      return;
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanEmail || !cleanPassword || !cleanConfirm) {
      toast.error("All fields required.");
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    toast("🔄 Submitting...", { duration: 2000 });

    try {
      let cred;

      try {
        cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        toast.success("✅ Account created!");
      } catch (err: any) {
        if (err.code === "auth/email-already-in-use") {
          toast("🔐 Email exists. Signing in...");
          cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          toast.success("✅ Signed in.");
        } else {
          throw err;
        }
      }

      const newProfile = {
        ...profile,
        uid: cred.user.uid,
        email: cleanEmail,
        created: serverTimestamp(),
      };

      await setDoc(doc(db, "profiles", code), newProfile);
      toast.success("✅ Profile saved! Redirecting...");
      router.replace(`/profile/${code}`);
    } catch (err: any) {
      console.error("🔥 Save error:", err);
      toast.error(err.message || "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 text-center">
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
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full mb-4 p-2 border rounded"
      />

      {Object.entries(profile).map(([key, val]) => (
        key !== "photoURL" && (
          <input
            key={key}
            placeholder={key[0].toUpperCase() + key.slice(1)}
            value={val}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                [key]: e.target.value.toLowerCase(),
              }))
            }
            onBlur={(e) => {
              let val = e.target.value.toLowerCase();
              if ((key === "website" || key === "linkedin") && val && !val.startsWith("http")) {
                val = "https://" + val;
              }
              if (key === "linkedin" && val && !val.includes("linkedin.com")) {
                toast.error("Enter a valid LinkedIn URL.");
                return;
              }
              setProfile((p) => ({ ...p, [key]: val }));
            }}
            className="w-full mb-3 p-2 border rounded"
          />
        )
      ))}

      <button
        onClick={handleCreateProfile}
        disabled={isSaving}
        className={`w-full px-4 py-2 rounded text-white ${
          isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-sky-500"
        }`}
      >
        {isSaving ? "Saving..." : "Create Profile"}
      </button>
    </div>
  );
}

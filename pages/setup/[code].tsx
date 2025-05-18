import { useEffect, useState } from "react";
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

  // ✅ safer than router.query.code for iPhone
  const code = router.asPath.split("/setup/")[1]?.split("?")[0] ?? "";

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
    if (!code || typeof code !== "string") {
      alert("❌ Missing code in URL.");
      return;
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanEmail || !cleanPassword || !cleanConfirm) {
      alert("❌ All fields are required.");
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      alert("❌ Passwords do not match.");
      return;
    }

    setIsSaving(true);
    toast("🔄 Submitting...", { duration: 1500 });

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

      console.log("🔐 Saving profile with UID:", cred.user.uid);

      await setDoc(doc(db, "profiles", code), {
        ...profile,
        uid: cred.user.uid, // ✅ always save uid
        email: cleanEmail,
        created: serverTimestamp(),
      });

      toast.success("✅ Profile saved! Redirecting...");
      router.replace(`/profile/${code}`);
    } catch (err: any) {
      console.error("🔥 Save error:", err);
      alert("❌ " + (err?.message || "Unknown error"));
      toast.error(err?.message || "Unexpected error.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Claim Your NFC Pin</h1>
      <p className="text-xs text-red-600 mb-3">Code: {String(code)}</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full mb-3 p-2 border rounded"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-3 p-2 border rounded"
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full mb-4 p-2 border rounded"
      />

      {Object.entries(profile).map(([key, val]) =>
        key !== "photoURL" ? (
          <input
            key={key}
            placeholder={key[0].toUpperCase() + key.slice(1)}
            value={val}
            onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
            onBlur={(e) => {
              let v = e.target.value;
              if ((key === "website" || key === "linkedin") && v && !v.startsWith("http")) {
                v = "https://" + v;
              }
              if (key === "linkedin" && !v.includes("linkedin.com")) {
                toast.error("Enter a valid LinkedIn URL.");
                return;
              }
              setProfile((p) => ({ ...p, [key]: v }));
            }}
            className="w-full mb-3 p-2 border rounded"
          />
        ) : null
      )}

      <button
        onClick={handleCreateProfile}
        disabled={isSaving}
        className={`w-full px-4 py-2 rounded text-white ${
          isSaving ? "bg-gray-400" : "bg-sky-500"
        }`}
      >
        {isSaving ? "Saving..." : "Create Profile"}
      </button>
    </div>
  );
}


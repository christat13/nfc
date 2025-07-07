import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/router";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import toast from "react-hot-toast";
import Image from "next/image";

export default function SetupProfile() {
  const router = useRouter();
  const { code } = router.query;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({
    firstName: "",
    lastName: "",
    title: "",
    company: "",
    phone: "",
    website: "",
    linkedin: "",
    photoURL: "",
  });

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !code || typeof code !== "string") return;

    try {
      const options = {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      const compressed = await imageCompression(file, options);
      const imageRef = storageRef(storage, `photos/${code}`);
      await uploadBytes(imageRef, compressed);
      const url = await getDownloadURL(imageRef);
      setProfile((prev) => ({ ...prev, photoURL: url }));
      toast.success("📸 Photo uploaded!");
    } catch (err) {
      console.error("Image upload failed:", err);
      toast.error("❌ Upload failed. Try again.");
    }
  };

  const handleSubmit = async () => {
    if (!code || typeof code !== "string" || !user) {
      toast.error("🚫 Missing code or user not signed in.");
      return;
    }

    try {
      await setDoc(doc(db, "profiles", code), {
        uid: user.uid,
        ...profile,
        createdAt: serverTimestamp(),
      });

      toast.success("✅ Profile saved!");
      router.push(`/profile/${code}`);
    } catch (err) {
      console.error("❌ Firestore error:", err);
      toast.error("🔥 Failed to save profile. Try again later.");
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      toast.error("⚠️ Passwords do not match.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success("🎉 Signed up successfully!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Sign-up failed.";

      if (
        typeof err === "object" &&
        err &&
        "code" in err &&
        (err as any).code === "auth/email-already-in-use"
      ) {
        toast.error("🚨 Email already in use. Try signing in instead.");
        setTimeout(() => {
          router.push(`/id/${code}`);
        }, 2000);
        return;
      }

      console.error("Sign-up error:", err);
      toast.error(`🚫 ${errorMessage}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Setup Your Pin</h1>

      {!user && (
        <div className="mb-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            className="border p-2 w-full mb-2"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            className="border p-2 w-full mb-2"
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            className="border p-2 w-full mb-2"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            onClick={handleSignUp}
          >
            Sign Up
          </button>
        </div>
      )}

      {user && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {["firstName", "lastName", "title", "company", "phone", "website", "linkedin"].map((key) => (
              <input
                key={key}
                className="border p-2"
                placeholder={key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                value={profile[key]}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            ))}

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />

            {profile.photoURL && (
              <Image
                src={profile.photoURL}
                alt="Uploaded"
                width={120}
                height={120}
                className="rounded mt-2"
              />
            )}

            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-4 py-2 mt-4 rounded"
            >
              Save Profile
            </button>
          </div>
        </>
      )}
    </div>
  );
}
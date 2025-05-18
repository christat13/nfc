import { useEffect, useState, useRef } from "react";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleImageUpload = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file || !code) return;

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
      toast.success("Photo uploaded!");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    }
  };

  const handleSubmit = async () => {
    if (!code || !user) {
      toast.error("Authentication incomplete or missing code.");
      return;
    }

    try {
      await setDoc(doc(db, "profiles", code), {
        uid: user.uid,
        firstName: profile.firstName,
        lastName: profile.lastName,
        title: profile.title,
        company: profile.company,
        phone: profile.phone,
        website: profile.website,
        linkedin: profile.linkedin,
        photoURL: profile.photoURL,
        createdAt: serverTimestamp(),
      });

      toast.success("✅ Profile saved!");
      router.push(`/profile/${code}`);
    } catch (err) {
      console.error("❌ Firestore error:", err);
      toast.error("Failed to save profile.");
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success("✅ Signed up successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Sign-up failed.");
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
            {[
              ["First Name", "firstName"],
              ["Last Name", "lastName"],
              ["Title", "title"],
              ["Company", "company"],
              ["Phone", "phone"],
              ["Website", "website"],
              ["LinkedIn", "linkedin"],
            ].map(([label, key]) => (
              <input
                key={key}
                className="border p-2"
                placeholder={label}
                value={(profile as any)[key]}
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


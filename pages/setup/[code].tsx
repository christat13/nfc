// FILE: /pages/setup/[code].tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { createUserWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";
import Image from "next/image";

export default function SetupProfile() {
  const router = useRouter();
  const { code } = router.query;

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    title: "",
    company: "",
    phone: "",
    website: "",
    linkedin: "",
    photoURL: ""
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!code || typeof code !== "string") return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = { maxSizeMB: 0.15, maxWidthOrHeight: 300, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      const fileRef = storageRef(storage, `photos/${code}.jpg`);
      await uploadBytes(fileRef, compressed);
      const url = await getDownloadURL(fileRef);
      setProfile({ ...profile, photoURL: url });
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error("Photo upload failed");
      console.error(err);
    }
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) return toast.error("Passwords don't match");
    if (!email || !password) return toast.error("Email and password required");
    if (!code || typeof code !== "string") {
      toast.error("Missing pin code. Please reload.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "profiles", code), {
        ...profile,
        email,
        uid: cred.user.uid,
        code,
        createdAt: serverTimestamp()
      });
      toast.success("Profile created!");
      router.push(`/profile/${code}`);
    } catch (err) {
      toast.error("Signup failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Claim Your NFC Pin</h1>

      <input placeholder="Email" className="w-full px-3 py-2 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" className="w-full px-3 py-2 border rounded" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="password" placeholder="Confirm Password" className="w-full px-3 py-2 border rounded" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

      <hr />

      {profile.photoURL && (
        <Image src={profile.photoURL} alt="Uploaded Photo" width={96} height={96} className="rounded-full border" />
      )}
      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full" />

      <input placeholder="First Name" className="w-full px-3 py-2 border rounded" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
      <input placeholder="Last Name" className="w-full px-3 py-2 border rounded" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
      <input placeholder="Title" className="w-full px-3 py-2 border rounded" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
      <input placeholder="Company" className="w-full px-3 py-2 border rounded" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
      <input placeholder="Phone" className="w-full px-3 py-2 border rounded" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
      <input placeholder="Website" className="w-full px-3 py-2 border rounded" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
      <input placeholder="LinkedIn" className="w-full px-3 py-2 border rounded" value={profile.linkedin} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} />

      <button onClick={handleSignup} className="w-full bg-cyan-600 text-white py-2 rounded" disabled={loading}>
        {loading ? "Saving..." : "Create Profile"}
      </button>
    </div>
  );
}

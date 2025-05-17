// FILE: /pages/id/[code].tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from "firebase/auth";
import toast from "react-hot-toast";
import Image from "next/image";

export default function EditProfile() {
  const router = useRouter();
  const { code } = router.query;

  const [user, setUser] = useState<User | null>(null);
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
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (authUser) setEmail(authUser.email || "");
    });
  }, []);

  useEffect(() => {
    if (
      typeof router.query.firstName === "string" &&
      !user && profile.firstName === ""
    ) {
      setProfile(prev => ({ ...prev, firstName: router.query.firstName as string }));
    }
  }, [router.query.firstName, user, profile.firstName]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!code) return;
      const ref = doc(db, "profiles", String(code));
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data() as typeof profile);
        setIsNewProfile(false);
      } else {
        setIsNewProfile(true);
      }
      setLoading(false);
    };
    loadProfile();
  }, [code]);

  const handleSave = async () => {
    if (!user) return toast.error("You must be signed in");
    try {
      await setDoc(doc(db, "profiles", String(code)), {
        ...profile,
        uid: user.uid,
        code,
        createdAt: serverTimestamp()
      });
      toast.success("Profile saved");
      router.push(`/profile/${code}`);
    } catch (err) {
      toast.error("Failed to save");
      console.error(err);
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) return toast.error("Passwords don't match");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success("Account created. Please fill in your profile.");
    } catch (err) {
      toast.error("Signup failed");
      console.error(err);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Signed in successfully");
    } catch (err) {
      toast.error("Sign in failed");
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!code || !user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = { maxSizeMB: 0.15, maxWidthOrHeight: 300, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileRef = storageRef(storage, `photos/${code}.jpg`);
      await uploadBytes(fileRef, compressedFile);
      const url = await getDownloadURL(fileRef);
      setProfile({ ...profile, photoURL: url });
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error("Photo upload failed");
      console.error(err);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">{isNewProfile ? "Create" : "Edit"} Your NFC Profile</h1>

      {!user ? (
        <div className="space-y-2">
          <input className="w-full px-3 py-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" className="w-full px-3 py-2 border rounded" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {isNewProfile && (
            <input type="password" className="w-full px-3 py-2 border rounded" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          )}
          <div className="flex gap-2">
            {isNewProfile ? (
              <button onClick={handleSignUp} className="px-4 py-2 bg-blue-600 text-white rounded">Sign Up</button>
            ) : (
              <button onClick={handleSignIn} className="px-4 py-2 bg-green-600 text-white rounded">Sign In</button>
            )}
          </div>
        </div>
      ) : (
        <>
          {profile.photoURL && (
            <Image src={profile.photoURL} alt="Profile Photo" width={96} height={96} className="rounded-full border" />
          )}
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full" />

          <input placeholder="First Name" className="w-full px-3 py-2 border rounded" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
          <input placeholder="Last Name" className="w-full px-3 py-2 border rounded" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
          <input placeholder="Title" className="w-full px-3 py-2 border rounded" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
          <input placeholder="Company" className="w-full px-3 py-2 border rounded" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
          <input placeholder="Phone Number" className="w-full px-3 py-2 border rounded" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <input placeholder="Website" className="w-full px-3 py-2 border rounded" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
          <input placeholder="LinkedIn" className="w-full px-3 py-2 border rounded" value={profile.linkedin} onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })} />
          <input placeholder="Email (from login)" className="w-full px-3 py-2 border rounded bg-gray-100" value={email} readOnly />
          <button onClick={handleSave} className="w-full px-4 py-2 bg-cyan-600 text-white rounded">Save Profile</button>
        </>
      )}
    </div>
  );
}

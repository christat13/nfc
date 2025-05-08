import { useRouter } from "next/router";
import Image from "next/image";
import { useEffect, useState } from "react";
import { db, auth } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User
} from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";

type ProfileData = {
  name: string;
  title: string;
  email: string;
  linkedin: string;
  website: string;
  photoURL?: string;
  owner?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    name: "",
    title: "",
    email: "",
    linkedin: "",
    website: "",
    photoURL: "",
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setAuthUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkProfile = async () => {
      if (typeof code !== "string") return;
      const docRef = doc(db, "profiles", code as string);
      const docSnap = await getDoc(docRef);
      setProfileExists(docSnap.exists());
      if (docSnap.exists()) {
        setFormData(docSnap.data() as ProfileData);
      }
    };
    if (code) checkProfile();
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast.success("Signed in successfully");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Signup failed");
      } else {
        toast.error("Signup failed");
      }
    }    
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      await setDoc(doc(db, "profiles", code as string), {
        ...formData,
        owner: cred.user.uid,
      });
      toast.success("Profile created!");
      router.push(`/profile/${code}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Signup failed");
      } else {
        toast.error("Signup failed");
      }
    }    
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !code) return;
    await setDoc(doc(db, "profiles", code as string), {
      ...formData,
      owner: authUser.uid,
    });
    toast.success("Profile updated");
    router.push(`/profile/${code}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-4 py-8 space-y-6 tron-grid animate-grid">
      <Toaster />
      <Image src="/logo.png" alt="TLDz Logo" width={80} height={30} />
      <h1 className="text-3xl font-bold text-cyan-400">More Than A Dot Profile</h1>
      <p className="text-xl bg-blue-100 px-4 py-2 rounded shadow z-10">Profile: {code}</p>

      {!authUser && profileExists === true && (
        <form onSubmit={handleLogin} className="space-y-4 w-full max-w-md z-10 border-t pt-4">
          <h2 className="text-lg font-semibold text-cyan-600">Sign in to edit</h2>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300"
          />
          <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded">
            Sign In
          </button>
        </form>
      )}

      {!authUser && profileExists === false && (
        <form onSubmit={handleSignup} className="space-y-4 w-full max-w-md z-10 border-t pt-4">
          <h2 className="text-lg font-semibold text-cyan-600">Create your profile</h2>
          {["name", "title", "email", "linkedin", "website"].map((field) => (
            <input
              key={field}
              name={field}
              type={field === "email" ? "email" : "text"}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={formData[field as keyof ProfileData] || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded border border-gray-300"
            />
          ))}
          <input
            type="email"
            placeholder="Account Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300"
          />
          <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded">
            Sign Up
          </button>
        </form>
      )}

      {authUser && (
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md z-10">
          {["name", "title", "email", "linkedin", "website"].map((field) => (
            <input
              key={field}
              name={field}
              type={field === "email" ? "email" : "text"}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={formData[field as keyof ProfileData] || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
          ))}
          <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded">
            Save Profile
          </button>
        </form>
      )}

      <p className="text-sm text-cyan-400 z-10">Scan, claim, or share your profile!</p>
    </div>
  );
}


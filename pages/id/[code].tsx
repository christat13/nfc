import { useRouter } from "next/router";
import Image from "next/image";
import { useEffect, useState } from "react";
import { db, auth } from "../../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";

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

  const [formData, setFormData] = useState<ProfileData>({
    name: "",
    title: "",
    email: "",
    linkedin: "",
    website: "",
    photoURL: "",
  });

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (typeof window === "undefined" || !code || !authUser) return;
      const docRef = doc(db, "profiles", code as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFormData(docSnap.data() as ProfileData);
      }
    };
    loadProfile();
  }, [code, authUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      if (isSignUp) {
        if (loginPassword !== confirmPassword) {
          setErrorMsg("Passwords do not match");
          return;
        }
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Authentication failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !authUser) return;
    const docRef = doc(db, "profiles", code as string);
    await setDoc(docRef, { ...formData, owner: authUser.uid });
    router.push(`/profile/${code}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-4 py-8 space-y-6 tron-grid animate-grid">
      <Image src="/logo.png" alt="TLDz Logo" width={80} height={30} />
      <h1 className="text-3xl font-bold text-cyan-400">More Than A Dot Profile</h1>
      <p className="text-xl bg-blue-100 px-4 py-2 rounded shadow z-10">Profile: {code}</p>

      {!authUser && (
        <form onSubmit={handleAuth} className="space-y-4 w-full max-w-md z-10 border-t pt-4">
          <h2 className="text-lg font-semibold text-cyan-600">
            {isSignUp ? "Create Account" : "Sign In to Edit"}
          </h2>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300"
            required
          />
          {isSignUp && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded border border-gray-300"
              required
            />
          )}
          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          <p className="text-sm text-center">
            {isSignUp ? "Already have an account?" : "Need to register?"}{" "}
            <button
              type="button"
              className="text-cyan-600 underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
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
          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded"
          >
            Save Profile
          </button>
        </form>
      )}

      <p className="text-sm text-cyan-400 z-10">Scan, claim, or share your profile!</p>

      <style jsx>{`
        @keyframes gridScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 120px;
          }
        }
        .tron-grid {
          position: relative;
          overflow: hidden;
        }
        .tron-grid::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image:
            repeating-linear-gradient(#00f0ff 0 2px, transparent 2px 100px),
            repeating-linear-gradient(90deg, #00f0ff 0 2px, transparent 2px 100px);
          transform: rotateX(70deg) scaleY(1.2) translateY(-20%);
          transform-origin: bottom;
          animation: gridScroll 10s linear infinite;
          opacity: 0.15;
          z-index: 0;
        }
        .animate-grid {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}

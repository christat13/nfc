import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  getDoc,
  setDoc,
  doc,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function EditProfile() {
  const router = useRouter();
  const { code } = router.query;
  const auth = getAuth();

  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [infoFile, setInfoFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!router.isReady || typeof code !== "string" || !authChecked) return;

    const fetchProfile = async () => {
      try {
        const refDoc = doc(db, "profiles", code);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);

          if (data.uid && (!user || user.uid !== data.uid)) {
            return; // User doesn't own the profile
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router.isReady, code, user, authChecked]);

  useEffect(() => {
    if (saveStatus === "success") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleInputChange = (e: any) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large (max 5MB)");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type. Please upload an image.");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleInfoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInfoFile(file);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      const fullUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
      new URL(fullUrl);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!code || typeof code !== "string" || !user) return;

    if (profile.coolLink && !isValidUrl(profile.coolLink)) {
      toast.error("Cool Link must be a valid URL (e.g., https://example.com)");
      return;
    }

    const refDoc = doc(db, "profiles", code);
    const updates: any = {
      ...profile,
      lastUpdated: new Date().toISOString(),
      uid: user.uid,
    };

    if (updates.coolLink && !updates.coolLink.startsWith("http")) {
      updates.coolLink = `https://${updates.coolLink}`;
    }

    try {
      if (photoFile) {
        const photoRef = ref(storage, `profile_photos/${code}`);
        await uploadBytes(photoRef, photoFile);
        const url = await getDownloadURL(photoRef);
        updates.photo = url;
        toast.success("Photo uploaded");
      }

      if (infoFile) {
        const infoRef = ref(storage, `profile_info/${code}`);
        await uploadBytes(infoRef, infoFile);
        const infoUrl = await getDownloadURL(infoRef);
        updates.info = infoUrl;
      }

      await setDoc(refDoc, updates, { merge: true });
      toast.success("Profile saved!");
      setSaveStatus("success");

      setPhotoPreview(null);
      setPhotoFile(null);
      setInfoFile(null);

      router.push(`/profile/${code}`);
    } catch (err) {
      console.error("Save failed", err);
      toast.error("Error saving profile.");
      setSaveStatus("error");
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      toast.error("Please fill out email and password");
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error", err);
      toast.error(err.message || "Authentication failed");
    }
  };

  if (loading || !authChecked) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-500 bg-white">
        Loading profile...
      </div>
    );
  }

  if (!user || (profile.uid && user.uid !== profile.uid)) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center text-[#473198]">{isSignUp ? "Claim Profile" : "Sign In"}</h1>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#BDB4BF] rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#BDB4BF] rounded px-3 py-2"
          />

          <button
            onClick={handleAuth}
            className="w-full bg-[#EF2828] hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            {isSignUp ? "Create Account & Claim" : "Sign In"}
          </button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-[#3185FC] text-center w-full"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need to claim this profile? Sign up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4 border border-[#473198] rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-2 text-[#EF2828]">Edit Profile</h1>

        {/* Photo preview and upload */}
        <div className="flex flex-col items-center space-y-2">
          {photoPreview || profile.photo ? (
            <img
              src={photoPreview || profile.photo}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border border-[#3185FC]"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#BDB4BF] text-black flex items-center justify-center border border-[#3185FC]">
              No Photo
            </div>
          )}
          <button
            type="button"
            onClick={() => document.getElementById("photoInput")?.click()}
            className="px-3 py-2 bg-[#3185FC] hover:bg-blue-400 text-black font-semibold rounded text-sm"
          >
            📸 Upload Photo
          </button>
          <input
            id="photoInput"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Info file upload */}
        <div>
          <label className="block text-sm mb-1 text-[#BDB4BF]">Upload Info File</label>
          {profile.info && (
            <a
              href={profile.info}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3185FC] underline text-sm block mb-1"
            >
              View current file
            </a>
          )}
          <button
            type="button"
            onClick={() => document.getElementById("infoInput")?.click()}
            className="px-3 py-2 bg-[#3185FC] hover:bg-blue-400 text-black font-semibold rounded text-sm"
          >
            📄 Upload Info File
          </button>
          <input
            id="infoInput"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleInfoFileChange}
            className="hidden"
          />
        </div>

        {/* Form fields */}
        {[
          { name: "name", label: "Full Name" },
          { name: "role", label: "Role / Title" },
          { name: "organization", label: "Organization" },
          { name: "email", label: "Email" },
          { name: "phone", label: "Phone" },
          { name: "coolLink", label: "Cool Link (e.g. website, article, social)" },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-sm mb-1 text-[#BDB4BF]">{field.label}</label>
            <input
              type="text"
              name={field.name}
              value={profile[field.name] || ""}
              onChange={handleInputChange}
              className="w-full border border-[#BDB4BF] bg-transparent text-white rounded px-3 py-2 text-sm"
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="w-full bg-[#EF2828] hover:bg-red-600 text-white py-2 px-4 rounded"
        >
          Save Profile
        </button>

        {saveStatus === "success" && (
          <p className="text-green-400 text-sm mt-1 text-center">
            ✅ Profile updated successfully
          </p>
        )}
      </div>
    </div>
  );
}

// This code provides an edit profile page for users to update their NFC profile information, including uploading a photo and info file.
// It allows users to edit their name, role, organization, email, phone, and a cool link.
// The profile data is fetched from Firestore, and changes are saved back to the database.
// ✅ Final fixed version of /pages/id/[code].tsx
// - Preserves original layout/buttons
// - Upload & crop photo works (FIXED)
// - File/Info upload intact
// - Social links stay full URLs with placeholder labels

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { db, auth, storage } from "@/lib/firebase";
import imageCompression from "browser-image-compression";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";
import { UploadTaskSnapshot } from "firebase/storage";
import {
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import {
  doc as firestoreDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { Dialog, DialogActions, DialogContent, Button } from "@mui/material";

export default function EditProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const safeCode = Array.isArray(code) ? code[0] : code;

  const [profile, setProfile] = useState<any>({});
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<any>({});
  const [croppingPhoto, setCroppingPhoto] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const infoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser && profileExists === false) await signOut(auth);
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [profileExists]);

  useEffect(() => {
    if (!safeCode) return;
    const fetchProfile = async () => {
      const docRef = firestoreDoc(db, "profiles", safeCode);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
        setProfileExists(true);
      } else {
        setProfile({});
        setProfileExists(false);
      }
    };
    fetchProfile();
  }, [safeCode]);

  const handleAuth = async () => {
    try {
      if (authMode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Signed up successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Signed in successfully!");
      }
      router.reload();
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return toast.error("Please enter your email");
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent!");
      setShowResetForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    }
  };

  const saveProfile = async () => {
    if (!safeCode || !user) return;
    const required = ["firstName", "lastName", "email"];
    const missing = required.filter((k) => !profile[k]);
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }
    try {
      setSaving(true);
      const docRef = firestoreDoc(db, "profiles", safeCode);
      await setDoc(
        docRef,
        {
          ...profile,
          uid: user.uid,
          claimed: true,
          claimedAt: profile.claimedAt || serverTimestamp(),
          lastUpdated: serverTimestamp(),
          downloads: increment(0),
          views: increment(0),
        },
        { merge: true }
      );
      toast.success("Profile saved! Redirecting...");
      setTimeout(() => router.push(`/profile/${safeCode}`), 2000);
    } catch (err: any) {
      toast.error(err.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: any, field: string) => {
    if (!safeCode || !user) return;
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const fileRef = ref(storage, `uploads/${safeCode}/${field}.${ext}`);
  const uploadTask = uploadBytesResumable(fileRef, file); // ✅ define it
    uploadTask.on(
      "state_changed",
      (snap: UploadTaskSnapshot) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgress((prev: Record<string, number>) => ({ ...prev, [field]: progress }));
      },
      (error: any) => {
        console.error(error);
        toast.error("Upload failed");
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setProfile((prev: typeof profile) => ({ ...prev, [field]: url }));
        await setDoc(firestoreDoc(db, "profiles", safeCode), { [field]: url }, { merge: true });
        toast.success(`${field} uploaded!`);
      }
    );
  };

  const handlePhotoChange = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return toast.error("Only image files allowed.");
    setCroppingPhoto(URL.createObjectURL(file));
  };

const uploadCroppedImage = async () => {
  if (!croppedAreaPixels || !safeCode || !user || !croppingPhoto) return;

  try {
    const croppedBlob = await getCroppedImg(croppingPhoto, croppedAreaPixels);
    const fileFromBlob = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });

    const compressedFile = await imageCompression(fileFromBlob, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    const fileRef = ref(storage, `uploads/${safeCode}/photo.jpg`);
    const uploadTask = uploadBytesResumable(fileRef, compressedFile);

    uploadTask.on(
      "state_changed",
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgress((prev: any) => ({ ...prev, photo: progress }));
      },
      (error) => {
        console.error(error);
        toast.error("Upload failed");
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setProfile((p: any) => ({ ...p, photo: url }));
        await setDoc(firestoreDoc(db, "profiles", safeCode), { photo: url }, { merge: true });
        toast.success("Photo uploaded!");
        setCroppingPhoto(null);
      }
    );
  } catch (err) {
    console.error(err);
    toast.error("Something went wrong during image upload.");
  }
};

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-gray-100 border-2 border-purple-600 rounded-2xl p-6 w-full max-w-md">
        {!user ? (
          <>
            <h2 className="text-xl font-bold mb-4 text-center">
              {profileExists ? "Sign In" : "Create Your Account"}
            </h2>
            <input type="email" className="w-full mb-2 p-2 rounded border" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" className="w-full mb-2 p-2 rounded border" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {authMode === "signup" && <input type="password" className="w-full mb-2 p-2 rounded border" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />}
            <button onClick={handleAuth} className="bg-purple-600 text-white w-full py-2 rounded mb-2">
              {authMode === "signup" ? "Sign Up" : "Sign In"}
            </button>
            <button onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")} className="text-sm text-blue-600">
              {authMode === "signup" ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
            {authMode === "signin" && <button onClick={() => setShowResetForm(true)} className="block text-sm mt-2 text-blue-500">Forgot Password?</button>}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-center">Welcome – Let’s Create Your Profile</h2>
            <div className="text-center text-sm mb-2 font-bold">Photo</div>
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-600">
                {profile.photo ? <img src={profile.photo} className="w-full h-full object-cover" /> : <span className="text-3xl flex justify-center items-center h-full">😊</span>}
              </div>
            </div>
            <button onClick={() => photoInputRef.current?.click()} className="block mb-4 text-sm text-blue-500 underline mx-auto">Upload Photo</button>
            <input type="file" accept="image/*" capture="environment" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />

            <label className="block text-sm font-bold">First Name</label>
            <input className="w-full mb-2 p-2 rounded border" value={profile.firstName || ""} onChange={(e) => setProfile((p: any) => ({ ...p, firstName: e.target.value }))} />
            <label className="block text-sm font-bold">Last Name</label>
            <input className="w-full mb-2 p-2 rounded border" value={profile.lastName || ""} onChange={(e) => setProfile((p: any) => ({ ...p, lastName: e.target.value }))} />
            <label className="block text-sm font-bold">Title</label>
            <input className="w-full mb-2 p-2 rounded border" value={profile.title || ""} onChange={(e) => setProfile((p: any) => ({ ...p, title: e.target.value }))} />
            <label className="block text-sm font-bold">Company</label>
            <input className="w-full mb-2 p-2 rounded border" value={profile.company || ""} onChange={(e) => setProfile((p: any) => ({ ...p, company: e.target.value }))} />
            <label className="block text-sm font-bold">Email</label>
            <input className="w-full mb-2 p-2 rounded border" value={profile.email || ""} onChange={(e) => setProfile((p: any) => ({ ...p, email: e.target.value }))} />
            <label className="block text-sm font-bold">Phone</label>
            <input className="w-full mb-2 p-2 rounded border" value={profile.phone || ""} onChange={(e) => setProfile((p: any) => ({ ...p, phone: e.target.value }))} />
            <label className="block text-sm font-bold">Website</label>
            <input className="w-full mb-2 p-2 rounded border" value={profile.website || ""} onChange={(e) => setProfile((p: any) => ({ ...p, website: e.target.value }))} />
            <label className="block text-sm font-bold">LinkedIn</label>
            <input className="w-full mb-2 p-2 rounded border" placeholder="https://linkedin.com/in/yourhandle" value={profile.linkedin || ""} onChange={(e) => setProfile((p: any) => ({ ...p, linkedin: e.target.value }))} />
            <label className="block text-sm font-bold">Twitter</label>
            <input className="w-full mb-2 p-2 rounded border" placeholder="https://twitter.com/yourhandle" value={profile.twitter || ""} onChange={(e) => setProfile((p: any) => ({ ...p, twitter: e.target.value }))} />
            <label className="block text-sm font-bold">Instagram</label>
            <input className="w-full mb-2 p-2 rounded border" placeholder="https://instagram.com/yourhandle" value={profile.instagram || ""} onChange={(e) => setProfile((p: any) => ({ ...p, instagram: e.target.value }))} />

            <div className="mt-3">
              <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-500 underline mr-4">Upload File</button>
              <button onClick={() => infoInputRef.current?.click()} className="text-sm text-blue-500 underline">Upload Info</button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, "file")} />
            <input type="file" ref={infoInputRef} className="hidden" onChange={(e) => handleFileUpload(e, "info")} />

            <button onClick={saveProfile} disabled={saving} className="w-full mt-4 py-2 bg-purple-600 text-white rounded">
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </>
        )}

        {showResetForm && (
          <Dialog open={true} onClose={() => setShowResetForm(false)}>
            <DialogContent>
              <input type="email" className="w-full mb-4 p-2 rounded border" placeholder="Enter your email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleResetPassword}>Send Reset Email</Button>
              <Button onClick={() => setShowResetForm(false)}>Cancel</Button>
            </DialogActions>
          </Dialog>
        )}

        {croppingPhoto && (
          <Dialog open={true} onClose={() => setCroppingPhoto(null)} fullWidth maxWidth="sm">
            <DialogContent>
              <div className="relative w-full h-64 bg-gray-200">
                <Cropper
                  image={croppingPhoto}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={uploadCroppedImage}>Save</Button>
              <Button onClick={() => setCroppingPhoto(null)}>Cancel</Button>
            </DialogActions>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// ✅ Final fixed version of /pages/id/[code].tsx
// - Preserves layout/buttons
// - Upload & crop photo works
// - File/Info upload intact
// - Social links stay full URLs

import { sendPasswordResetEmail } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { db, auth, storage } from "@/lib/firebase";
import imageCompression from "browser-image-compression";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";
import {
  doc as firestoreDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
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
import toast, { Toaster } from "react-hot-toast";
import { Dialog, DialogActions, DialogContent, Button } from "@mui/material";

export default function EditProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const safeCode = Array.isArray(code) ? code[0] : code;

  const [profile, setProfile] = useState<any>({});
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
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
    const requiredFields = ["firstName", "lastName", "email"];
    const missingFields = requiredFields.filter((key) => !profile[key]);
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
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
          lastUpdated: serverTimestamp(),
          claimed: true,
          claimedAt: profile.claimedAt || serverTimestamp(),
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
    const uploadTask = uploadBytesResumable(fileRef, file);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress((prev) => ({ ...prev, [field]: progress }));
      },
      () => toast.error("Upload failed"),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setProfile((prev: any) => ({ ...prev, [field]: url }));
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
      (snap) => setUploadProgress((p) => ({ ...p, photo: (snap.bytesTransferred / snap.totalBytes) * 100 })),
      () => toast.error("Upload failed"),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setProfile((prev: any) => ({ ...prev, photo: url }));
        await setDoc(firestoreDoc(db, "profiles", safeCode), { photo: url }, { merge: true });
        toast.success("Photo uploaded!");
        setCroppingPhoto(null);
      }
    );
  };

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-gray-100 rounded-2xl p-6 shadow-lg border border-purple-600 w-full max-w-md">
        {/* AUTH */}
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
            <h2 className="text-xl font-bold mb-4 text-center">Edit Your Profile</h2>
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-600">
                {profile.photo ? <img src={profile.photo} className="w-full h-full object-cover" /> : <span className="text-4xl flex justify-center items-center h-full">😊</span>}
              </div>
            </div>
            <button onClick={() => photoInputRef.current?.click()} className="w-full mb-4 text-sm text-blue-500 underline">Upload Photo</button>
            <input type="file" accept="image/*" capture="environment" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />

            {["firstName","lastName","title","company","email","phone","website","linkedin","twitter","instagram"].map((key) => (
              <input key={key} className="w-full mb-2 p-2 rounded border" placeholder={key} value={profile[key] || ""} onChange={(e) => setProfile((p: any) => ({ ...p, [key]: e.target.value }))} />
            ))}

            <div className="mt-2">
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

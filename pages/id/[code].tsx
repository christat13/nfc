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
  const [loadingProfile, setLoadingProfile] = useState(true);
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
  const [aspectRatio, setAspectRatio] = useState<number>(1); // default 1:1
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const infoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCroppedPhoto, setUploadingCroppedPhoto] = useState(false);


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
      setLoadingProfile(true);
      const docRef = firestoreDoc(db, "profiles", safeCode as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
        setProfileExists(true);
      } else {
        setProfile({});
        setProfileExists(false);
      }
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [safeCode]);

  // ✅ Show spinner while loading profile
  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading your profile...</p>
      </div>
    );
  }


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
      const docRef = firestoreDoc(db, "profiles", safeCode as string);
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
        await setDoc(firestoreDoc(db, "profiles", safeCode as string), { [field]: url }, { merge: true });
        toast.success(`${field} uploaded!`);
      }
    );
  };

  const handlePhotoChange = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      return toast.error("Only image files allowed.");
    }

    // ✅ File size check: 2MB max
    const maxSizeMB = 2;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return toast.error("Image too large. Max file size is 2MB.");
    }

    // ✅ Image dimension check: 2048x2048 max
    const img = new Image();
    img.onload = () => {
      if (img.width > 2048 || img.height > 2048) {
        return toast.error("Image too large. Max dimensions: 2048x2048.");
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCroppingPhoto(reader.result as string); // ✅ Opens cropper
        toast.success("Image loaded! You can crop it now.");
      };
      reader.readAsDataURL(file);
    };
    img.src = URL.createObjectURL(file);
  };

const uploadCroppedImage = async () => {
  if (!croppedAreaPixels || !safeCode || !user || !croppingPhoto) return;

  try {
    setUploadingCroppedPhoto(true); // 👈 Start spinner

    const croppedBlob = await getCroppedImg(croppingPhoto, croppedAreaPixels);
    if (!croppedBlob || !(croppedBlob instanceof Blob)) {
      throw new Error("Invalid cropped image data");
    }

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
        console.error("Upload error:", error);
        toast.error("Photo upload failed");
        setUploadingCroppedPhoto(false); // 👈 Stop spinner on error
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await setDoc(firestoreDoc(db, "profiles", safeCode as string), { photo: url }, { merge: true });
        setProfile((prev: any) => ({ ...prev, photo: url }));
        toast.success("Photo uploaded!");
        setUploadingCroppedPhoto(false); // 👈 Stop spinner on success
        setCroppingPhoto(null);
      }
    );
  } catch (err: any) {
    console.error("Upload exception:", err);
    toast.error("Something went wrong during image upload.");
    setUploadingCroppedPhoto(false);
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
            <>
              <h2 className="text-xl font-bold mb-4 text-center">Welcome – Let’s Create Your Profile</h2>
              <div className="text-center text-sm font-medium text-gray-700 mb-1">Photo</div>
              <div className="flex justify-center mb-2">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-600">
                  {profile.photo ? (
                    <img src={profile.photo} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl flex justify-center items-center h-full">😊</span>
                  )}
                </div>
              </div>
              <label
                htmlFor="photo-upload"
                className="block mb-4 text-sm text-blue-500 underline text-center cursor-pointer"
              >
                📷 Tap to Take or Upload Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <div className="mt-2 text-sm text-gray-700 text-center">
                {profile.file && (
                  <div>
                    📎 <a
                      href={profile.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View File
                    </a>
                  </div>
                )}

                {profile.info && (
                  <div>
                    📝 <a
                      href={profile.info}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Info
                    </a>
                  </div>
                )}
              </div>

              {/* Input Fields */}
              <label className="block text-sm font-medium text-gray-700">
                First Name<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                value={profile.firstName || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, firstName: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">
                Last Name<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                value={profile.lastName || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, lastName: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                value={profile.title || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, title: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                value={profile.company || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, company: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">
                Email<span className="text-red-500 ml-0.5">*</span>
              </label>

              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                value={profile.email || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, email: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                value={profile.phone || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, phone: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">Website</label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                value={profile.website || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, website: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://linkedin.com/in/yourhandle"
                value={profile.linkedin || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, linkedin: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">Twitter</label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://twitter.com/yourhandle"
                value={profile.twitter || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, twitter: e.target.value }))}
              />

              <label className="block text-sm font-medium text-gray-700">Instagram</label>
              <input
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://instagram.com/yourhandle"
                value={profile.instagram || ""}
                onChange={(e) => setProfile((p: any) => ({ ...p, instagram: e.target.value }))}
              />

              {/* File + Info Upload */}
              <div className="mt-3 flex justify-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-500 underline"
                >
                  Upload File
                </button>
                <button
                  onClick={() => infoInputRef.current?.click()}
                  className="text-sm text-blue-500 underline"
                >
                  Upload Info
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => handleFileUpload(e, "file")}
              />
              <input
                type="file"
                ref={infoInputRef}
                className="hidden"
                onChange={(e) => handleFileUpload(e, "info")}
              />

              {/* Save Button */}
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full mt-4 py-2 bg-purple-600 text-white rounded flex justify-center items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </button>
            </>
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
                {uploadingCroppedPhoto && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600 border-solid" />
                  </div>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={uploadCroppedImage} disabled={uploadingCroppedPhoto}>
                {uploadingCroppedPhoto ? "Uploading..." : "Save"}
              </Button>
              <Button onClick={() => setCroppingPhoto(null)} disabled={uploadingCroppedPhoto}>
                Cancel
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </div>
    </div>
  );
}

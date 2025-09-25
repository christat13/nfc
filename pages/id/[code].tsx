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
import type { UploadTaskSnapshot } from "firebase/storage";

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
  const [loadingUser, setLoadingUser] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<any>({});
  const [croppingPhoto, setCroppingPhoto] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1); // default 1:1
  const fileInputRef = useRef<HTMLInputElement>(null);
  const infoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCroppedPhoto, setUploadingCroppedPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const cropperRef = useRef<HTMLDivElement>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const onCropComplete = (_: any, areaPixels: any) => {setCroppedAreaPixels(areaPixels);};

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingUser(false);
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
  if (loadingProfile || loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading your profile...</p>
      </div>
    );
  }

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
    if (!safeCode) return;
    const required = ["firstName", "lastName", "email"];
    const missing = required.filter((k) => !profile[k]);
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }
    if (!user && profileExists === false) {
      if (!email || !password || !confirmPassword) {
        toast.error("Email and password are required");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        setUser(userCred.user);
        setProfile((prev: any) => ({ ...prev, email }));
      } catch (err: any) {
        toast.error(err.message || "Sign-up failed");
        return;
      }
    }
    if (!user) {
      toast.error("You must be signed in to save your profile");
      return;
    }
      if (profileExists && profile.uid && user.uid !== profile.uid) {
        toast.error("This pin is already owned by another account.");
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
      setTimeout(() => router.push(`/profile/${safeCode}`), 1500);
    } catch (err: any) {
      toast.error(err.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: any, field: string) => {
  if (!safeCode || !user) return;
  const file = e.target.files?.[0];
  if (!file) return;

  const hasExt = file.name.includes(".");
  const path = `uploads/${safeCode}/${field}/${hasExt ? file.name : `${file.name || "upload"}.bin`}`;
  const storagePath = ref(storage, path);

  const uploadTask = uploadBytesResumable(storagePath, file);
  uploadTask.on(
    "state_changed",
    (snap: UploadTaskSnapshot) => {
      const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
      setUploadProgress((prev: Record<string, number>) => ({ ...prev, [field]: progress }));
    },
    () => toast.error("Upload failed"),
    async () => {
      try {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await setDoc(firestoreDoc(db, "profiles", safeCode as string), { [field]: url }, { merge: true });
        setProfile((prev: any) => ({ ...prev, [field]: url, [`${field}Name`]: file.name || "upload" }));
        toast.success(`${field === "file" ? "File" : "Info"} uploaded!`);
      } catch {
        toast.error("Error finalizing upload.");
      }
    }
  );
};


  const handlePhotoChange = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return toast.error("Only image files allowed.");
    const maxSizeMB = 2;
    if (file.size > 15 * 1024 * 1024) {
      toast("Large photo detected — we’ll shrink it automatically.", { icon: "📷" });
    }

    const img = new Image();
    img.onload = () => {
      const reader = new FileReader();
      reader.onload = () => {
        setCroppingPhoto(reader.result as string);
        setTimeout(() => cropperRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        toast.success("Image loaded! Crop before uploading");
      };
      reader.readAsDataURL(file);
    };
    img.src = URL.createObjectURL(file);
  };


const uploadCroppedImage = async () => {
    if (!croppedAreaPixels || !safeCode || !user || !croppingPhoto) return;
    try {
      setUploadingCroppedPhoto(true);
      const croppedBlob = await getCroppedImg(croppingPhoto, croppedAreaPixels, {mime: "image/jpeg", quality: 0.9,});

      const fileFromBlob = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
      const compressedFile = await imageCompression(fileFromBlob, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
      const fileRef = ref(storage, `uploads/${safeCode}/photo.jpg`);
      const uploadTask = uploadBytesResumable(fileRef, compressedFile);
      let timeoutId = setTimeout(() => {
        setUploadingCroppedPhoto(false);
        toast.error("Upload timed out. Please try again.");
      }, 30000);
      uploadTask.on(
        "state_changed",
        (snap) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setUploadingCroppedPhoto(false);
            toast.error("Upload timed out. Please try again.");
          }, 30000);
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          setUploadProgress((prev: any) => ({ ...prev, photo: progress }));
        },
        (error) => {
          clearTimeout(timeoutId);
          setUploadingCroppedPhoto(false);
          toast.error("Photo upload failed");
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await setDoc(firestoreDoc(db, "profiles", safeCode as string), { photo: url }, { merge: true });
            setProfile((prev: any) => ({ ...prev, photo: url }));
            setPhotoVersion(v => v + 1); 
            toast.success("Photo uploaded!");
          } catch (err) {
            toast.error("Error finalizing upload");
          } finally {
            clearTimeout(timeoutId);
            setUploadingCroppedPhoto(false);
            setCroppingPhoto(null);
          }
        }
      );
    } catch (err: any) {
      toast.error("Image upload error");
      setUploadingCroppedPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-gray-100 border-2 border-purple-600 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-center">Welcome – Let’s Create Your Profile</h2>

        {!user && profileExists === false && (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Email<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="email"
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700">
              Password<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700">
              Confirm Password<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="flex justify-end mb-3">
              <button
                type="button"
                className="text-xs text-blue-600 underline"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide Passwords" : "Show Passwords"}
              </button>
            </div>
          </>
        )}

        {/* Profile Photo */}
        <div className="text-center text-sm font-medium text-gray-700 mb-1">Photo</div>
        <div className="flex justify-center mb-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-600 bg-white">
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photoVersion}  // forces React to remount the <img> when version changes
                src={`${profile.photo}${profile.photo.includes("?") ? "&" : "?"}v=${photoVersion}`}
                className="w-full h-full object-cover"
                alt="Profile"
              />
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

        {/* Uploaded file/info display */}
        {profile.file && (
          <div className="text-sm mt-1 text-center text-gray-600">
            📎 File uploaded:{" "}
            <a
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
          <div className="text-sm text-center text-gray-600">
            📝 Additional info uploaded:{" "}
            <a
              href={profile.info}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              View additional info
            </a>
          </div>
        )}

      {/* Upload Buttons */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-blue-500 underline"
          >
            Upload File
          </button>

          <button
            onClick={() => infoInputRef.current?.click()}
            className="text-sm text-blue-500 underline"
            title="Optional PDF or document to accompany your card"
          >
            Upload additional info (PDF, optional)
          </button>
        </div>

        {/* tiny helper text */}
        <p className="text-xs text-gray-500 text-center">
          Use “additional info” for a resume, one-pager, or product sheet.
        </p>
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
        accept=".pdf,.doc,.docx,.txt,image/*"
        onChange={(e) => handleFileUpload(e, "info")}
      />


        {/* Profile Input Fields */}
        <label className="block text-sm font-medium text-gray-700 mt-4">
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

        {/* Save Button */}
        <button
          onClick={saveProfile}
          disabled={saving || uploadingCroppedPhoto}
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
              <div ref={cropperRef} className="relative w-full h-64 bg-gray-200">
                <Cropper
                  image={croppingPhoto}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                  cropShape="rect"
                  showGrid={true}
                  classes={{
                    cropAreaClassName: "custom-crop-area",
                  }}
                />
                {uploadingCroppedPhoto && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600 border-solid" />
                  </div>
                )}
                <style jsx global>{`
                  .custom-crop-area {
                    border: 2px solid #ef2828
                  }
                `}</style>
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

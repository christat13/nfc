// /pages/id/[code].tsx
// Clean blue theme, separate photo actions, document uploads at bottom (3 options), token-URL storage flow.

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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  doc as firestoreDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

import toast, { Toaster } from "react-hot-toast";
import { Dialog, DialogActions, DialogContent, Button } from "@mui/material";

// Normalize any user-entered URL into an https:// URL.
// Leaves mailto:, tel:, and existing http(s) as-is.
function normalizeUrl(raw?: string): string {
  if (!raw) return "";
  const s = raw.trim();

  // already has a scheme we allow
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;

  // add https:// if they typed a naked domain/path
  return `https://${s.replace(/^\/+/, "")}`;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const safeCode = Array.isArray(code) ? code[0] : code;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>({});
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Step A creds
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Reset password dialog
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // UI + upload states
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [croppingPhoto, setCroppingPhoto] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [aspectRatio] = useState<number>(1);
  const [uploadingCroppedPhoto, setUploadingCroppedPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const cropperRef = useRef<HTMLDivElement>(null);

  // file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);      // capture=environment
  const photoFileInputRef = useRef<HTMLInputElement>(null);   // regular file picker
  const infoInputRef = useRef<HTMLInputElement>(null);
  const fileShare1Ref = useRef<HTMLInputElement>(null);
  const fileShare2Ref = useRef<HTMLInputElement>(null);

  // wizard step
  const [step, setStep] = useState<"A" | "B">("A");

  // ---------- helpers (Option B & migration) ----------
  const isHttpUrl = (s?: string) => !!s && /^https?:\/\//i.test(s);
  const looksLikeStoragePath = (s?: string) =>
    !!s && !isHttpUrl(s) && /^(uploads|profile_photos)\//.test(s);

  const upgradeFieldToDownloadUrl = async (field: string, pathVal: string) => {
    try {
      const url = await getDownloadURL(ref(storage, pathVal));
      await setDoc(
        firestoreDoc(db, "profiles", safeCode as string),
        { [field]: url, lastUpdated: serverTimestamp() },
        { merge: true }
      );
      setProfile((p: any) => ({ ...p, [field]: url }));
      if (field === "photo") setPhotoVersion((v) => v + 1);
    } catch (e: any) {
      console.warn(`[migrate] ${field} upgrade failed`, e?.code || e?.message || e);
    }
  };

  const migrateLegacyPathsIfNeeded = async (data: any) => {
    if (!safeCode || !data) return;
    const fields = ["file", "info", "fileShare1", "fileShare2", "photo"];
    for (const f of fields) {
      const val = data[f];
      if (looksLikeStoragePath(val)) await upgradeFieldToDownloadUrl(f, val);
    }
  };

  // ---- upload limits ----
  const DOC_MAX_MB = 10;
  const DOC_ALLOWED = /\.(pdf|docx?|txt|png|jpe?g)$/i;

  const PHOTO_MAX_MB = 5;
  // we’ll still check MIME, but extension guard catches most cases
  const isImage = (f: File) =>
    (f.type && f.type.startsWith("image/")) ||
    /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(f.name);

  // generic validator
  function validateFileOrToast(file: File, { maxMB, allowedExt }: { maxMB: number; allowedExt?: RegExp }) {
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Max file size is ${maxMB} MB`);
      return false;
    }
    if (allowedExt && !allowedExt.test(file.name)) {
      toast.error("Allowed types: pdf, doc, docx, txt, png, jpg, jpeg");
      return false;
    }
    return true;
  }

  // ---------- auth boot ----------
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) setStep("B");
    if (user?.email) setProfile((p: any) => ({ ...p, email: user.email }));
  }, [user]);

  useEffect(() => {
    if (!router.isReady || !safeCode) return;
    setLoadingProfile(true);
    setProfileExists(null);

    const fetchProfile = async () => {
      try {
        const docRef = firestoreDoc(db, "profiles", safeCode as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setProfileExists(true);
          migrateLegacyPathsIfNeeded(data);
        } else {
          setProfile({});
          setProfileExists(false);
        }
      } catch (err: any) {
        console.error("[profile] load error:", err?.code || err, err?.message);
        toast.error(err?.message || "Failed to load profile");
        setProfile({});
        setProfileExists(false);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [router.isReady, safeCode]);

  // ---------- auth actions ----------
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

  const handleSignIn = async () => {
    if (!email || !password) return toast.error("Enter email and password");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true); // refresh token so Storage sees auth immediately
      setUser(cred.user);
      toast.success("Signed in");
    } catch (e: any) {
      toast.error(e?.message || "Sign-in failed");
    }
  };

  const handleCreateAccountAndContinue = async () => {
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
      await userCred.user.getIdToken(true); // force-refresh token
      setUser(userCred.user);
      setProfile((p: any) => ({ ...p, email: userCred.user.email || email }));
      const ok = await ensureClaim();
      if (ok) setStep("B");
      toast.success("Account created.  Continue below.");
    } catch (err: any) {
      toast.error(err?.message || "Sign-up failed");
    }
  };

  // Ensure Firestore ownership for rules
  const ensureClaim = async (): Promise<boolean> => {
    if (!user || !safeCode) return false;

    const refDoc = firestoreDoc(db, "profiles", safeCode as string);
    const snap = await getDoc(refDoc);

    if (!snap.exists()) {
      await setDoc(
        refDoc,
        {
          uid: user.uid,
          claimed: true,
          claimedAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
      setProfile((p: any) => ({ ...p, uid: user.uid, claimed: true }));
      setProfileExists(true);
      return true;
    }

    const data = snap.data() || {};
    if (!data.uid) {
      await setDoc(
        refDoc,
        {
          uid: user.uid,
          claimed: true,
          claimedAt: data.claimedAt || serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
      setProfile((p: any) => ({ ...p, uid: user.uid, claimed: true }));
      setProfileExists(true);
      return true;
    }

    if (data.uid !== user.uid) {
      toast.error("This pin is already owned by another account.");
      return false;
    }

    return true;
  };

  const saveProfile = async () => {
    if (!safeCode) return;
    const required = ["firstName", "lastName", "email"];
    const missing = required.filter((k) => !profile[k]);
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
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

      // ✅ normalize URLs before saving
      const cleaned = {
        ...profile,
        firstName: (profile.firstName || "").trim(),
        lastName: (profile.lastName || "").trim(),
        title: (profile.title || "").trim(),
        company: (profile.company || "").trim(),
        website: normalizeUrl(profile.website),
        linkedin: normalizeUrl(profile.linkedin),
        twitter: normalizeUrl(profile.twitter),
        instagram: normalizeUrl(profile.instagram),
      };

      await setDoc(
        firestoreDoc(db, "profiles", safeCode as string),
        {
          ...cleaned,
          uid: user.uid,
          claimed: true,
          claimedAt: profile.claimedAt || serverTimestamp(),
          lastUpdated: serverTimestamp(),
          downloads: increment(0),
          views: increment(0),
        },
        { merge: true }
      );

      toast.success("Profile saved!  Redirecting...");
      setTimeout(() => router.push(`/profile/${safeCode}`), 1500);
    } catch (err: any) {
      toast.error(err.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  // ---------- generic file uploads ----------
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "fileShare1" | "fileShare2" | "info"
  ) => {
    try {
      if (!safeCode) return toast.error("Missing code.");
      if (!user) return toast.error("Please sign in first.");
      const ok = await ensureClaim();
      if (!ok) return;

      const file = e.target.files?.[0];
      (e.target as HTMLInputElement).value = "";
      if (!file) return;

      // validate size & type for docs
      if (!validateFileOrToast(file, { maxMB: DOC_MAX_MB, allowedExt: DOC_ALLOWED })) return;

      console.log("[DOC] AUTH uid =", auth.currentUser?.uid);
      console.log("[DOC] PATH =", `uploads/${user.uid}/${safeCode}/${field}/${Date.now()}_${file.name}`);

      const path = `uploads/${user.uid}/${safeCode}/${field}/${Date.now()}_${file.name}`;
      const sRef = ref(storage, path);

      setUploadProgress((prev) => ({ ...prev, [field]: 0 }));

      const task = uploadBytesResumable(sRef, file, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=604800",
        customMetadata: {
          code: String(safeCode),
          ownerUid: user.uid,
          originalName: file.name,
        },
      });

      task.on(
        "state_changed",
        (snap: UploadTaskSnapshot) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress((prev) => ({ ...prev, [field]: pct }));
        },
        (error: any) => {
          console.error("[storage error]", error?.code, error?.message, error);
          setUploadProgress((prev) => ({ ...prev, [field]: 0 }));
          toast.error(`${error?.code || "storage/error"}: ${error?.message || "Upload failed."}`);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await setDoc(
            firestoreDoc(db, "profiles", safeCode as string),
            { [field]: url, [`${field}Name`]: file.name, lastUpdated: serverTimestamp() },
            { merge: true }
          );
          setProfile((prev: any) => ({ ...prev, [field]: url, [`${field}Name`]: file.name }));
          setUploadProgress((prev) => ({ ...prev, [field]: 100 }));
          toast.success("Uploaded!");
          setTimeout(() => setUploadProgress((prev) => ({ ...prev, [field]: 0 })), 800);
        }
      );
    } catch (err: any) {
      console.error("[storage error]", err?.code, err?.message, err);
      toast.error(`${err?.code || "storage/error"}: ${err?.message || "Upload failed"}`);
    }
  };

  // ---------- PHOTO: select image (from file picker) ----------
  const choosePhotoFromFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    (e.target as HTMLInputElement).value = "";
    if (!file) return;

    if (!isImage(file)) {
      toast.error("Only image files allowed.");
      return;
    }
    // enforce PHOTO_MAX_MB
    if (!validateFileOrToast(file, { maxMB: PHOTO_MAX_MB })) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCroppingPhoto(reader.result as string);
      setTimeout(() => cropperRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    reader.onerror = () => toast.error("Could not read image file.");
    reader.readAsDataURL(file);
  };

  // ---------- PHOTO: capture from camera ----------
  const choosePhotoFromCamera = (e: React.ChangeEvent<HTMLInputElement>) => {
    // same handling; capture input provides camera stream on mobile
    choosePhotoFromFiles(e);
  };

  // ---------- PHOTO: upload cropped result ----------
  const uploadCroppedImage = async () => {
    if (!safeCode) return toast.error("Missing code.");
    if (!user) return toast.error("Please sign in first.");
    if (!croppingPhoto) return toast.error("Load a photo first.");
    if (!croppedAreaPixels) return toast.error("Crop the image first.");

    const ok = await ensureClaim();
    if (!ok) return;

    try {
      setUploadingCroppedPhoto(true);

      const croppedBlob: Blob = await getCroppedImg(croppingPhoto, croppedAreaPixels, {
        mime: "image/jpeg",
        quality: 0.9,
      });

      if (!croppedBlob || croppedBlob.size < 1024) {
        throw new Error("Cropped image is empty.  Try reselecting the photo.");
      }

      const fileFromBlob = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
      if (!validateFileOrToast(fileFromBlob, { maxMB: PHOTO_MAX_MB })) {
        setUploadingCroppedPhoto(false);
        return;
      }

      const compressedFile = await imageCompression(fileFromBlob, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      // Optional: post-compression guard
      if (!validateFileOrToast(compressedFile as File, { maxMB: PHOTO_MAX_MB })) {
        setUploadingCroppedPhoto(false);
        return;
      }

      const filename = `photo_${Date.now()}.jpg`;
      const fullPath = `profile_photos/${user.uid}/${safeCode}/${filename}`;
      console.log("[PHOTO] AUTH uid =", auth.currentUser?.uid);
      console.log("[PHOTO] PATH =", fullPath);

      const fileRef = ref(storage, fullPath);
      const metadata = {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=604800",
        customMetadata: { code: String(safeCode), ownerUid: user.uid },
      };
      const task = uploadBytesResumable(fileRef, compressedFile, metadata);

      task.on(
        "state_changed",
        (snap) => {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          setUploadProgress((prev: any) => ({ ...prev, photo: progress }));
        },
        (error: any) => {
          console.error("[storage error]", error?.code, error?.message, error);
          setUploadingCroppedPhoto(false);
          toast.error(`${error?.code || "storage/error"}: ${error?.message || "Upload failed"}`);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await setDoc(
            firestoreDoc(db, "profiles", safeCode as string),
            { photo: url, lastUpdated: serverTimestamp() },
            { merge: true }
          );

          setProfile((prev: any) => ({ ...prev, photo: url }));
          setPhotoVersion((v) => v + 1);
          setUploadingCroppedPhoto(false);
          setCroppingPhoto(null);
          setCroppedAreaPixels(null);
          toast.success("Photo uploaded!");
        }
      );
    } catch (err: any) {
      setUploadingCroppedPhoto(false);
      console.error("[photo] handler error", err);
      toast.error(err?.message ?? "Image upload error.");
    }
  };

  // ---------- render ----------

  if (loadingProfile || loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-gray-100 border-2 border-blue-600 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-center">Welcome - Let’s Create Your Profile</h2>

        {/* ---------- STEP A: Create account ---------- */}
        {step === "A" && profileExists === false && !user && (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Email<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="block text-sm font-medium text-gray-700">
              Password<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label className="block text-sm font-medium text-gray-700">
              Confirm Password<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                className="text-xs text-blue-600 underline"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Hide Passwords" : "Show Passwords"}
              </button>
              <button
                type="button"
                className="text-xs text-blue-600 underline"
                onClick={() => setShowResetForm(true)}
              >
                Forgot password?
              </button>
            </div>

            <button onClick={handleCreateAccountAndContinue} className="w-full py-2 bg-blue-600 text-white rounded">
              Continue
            </button>
          </>
        )}

        {/* ---------- SIGN IN (existing profile) ---------- */}
        {profileExists && !user && (
          <>
            <div className="mt-6 text-sm font-medium text-gray-700">Sign in to edit this profile</div>

            <input
              type="email"
              className="w-full mt-2 mb-2 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type={showPassword ? "text" : "password"}
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                className="text-xs text-blue-600 underline"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Hide Password" : "Show Password"}
              </button>
              <button type="button" className="text-xs text-blue-600 underline" onClick={() => setShowResetForm(true)}>
                Forgot password?
              </button>
            </div>

            <button onClick={handleSignIn} className="w-full py-2 bg-blue-600 text-white rounded mb-4">
              Sign In
            </button>
          </>
        )}

        {/* ---------- PART B: Signed-in editor ---------- */}
        {(step === "B" || !!user) && (
          <>
            {/* Photo block */}
            <div className="text-center text-sm font-medium text-gray-700 mb-2">Photo</div>
            <div className="flex justify-center mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-600 bg-white">
                {profile.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photoVersion}
                    src={`${profile.photo}${profile.photo.includes("?") ? "&" : "?"}v=${photoVersion}`}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <span className="text-4xl flex justify-center items-center h-full">😊</span>
                )}
              </div>
            </div>

            {/* Separate actions: camera vs file */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-60"
                disabled={uploadingCroppedPhoto}
              >
                Tap to Take a Photo
              </button>
              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-60"
                disabled={uploadingCroppedPhoto}
              >
                Upload Photo
              </button>
            </div>

            {/* hidden inputs for photo choices */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={choosePhotoFromCamera}
              className="hidden"
            />
            <input
              ref={photoFileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={choosePhotoFromFiles}
              className="hidden"
            />

            {/* Fields */}
            <label className="block text-sm font-medium text-gray-700">
              First Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              value={profile.firstName || ""}
              onChange={(e) => setProfile((p: any) => ({ ...p, firstName: e.target.value }))}
              required
            />

            <label className="block text-sm font-medium text-gray-700">
              Last Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              value={profile.lastName || ""}
              onChange={(e) => setProfile((p: any) => ({ ...p, lastName: e.target.value }))}
              required
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

            <div className="mb-2 text-sm text-gray-700">
              <span className="font-medium">Email:</span> {user?.email || profile.email || "(not set)"}
            </div>

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
              className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://instagram.com/yourhandle"
              value={profile.instagram || ""}
              onChange={(e) => setProfile((p: any) => ({ ...p, instagram: e.target.value }))}
            />

            {/* ---------- Upload documents to share (bottom) ---------- */}
            <div className="mt-2 pt-4 border-t border-gray-300">
              <div className="text-sm font-medium text-gray-700 mb-3">
                Upload documents to share:
              </div>

              {/* File to Share #1 */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700">File to Share</div>
                <button
                  type="button"
                  onClick={() => fileShare1Ref.current?.click()}
                  className="text-sm underline disabled:opacity-60"
                  disabled={!!uploadProgress.fileShare1 || uploadingCroppedPhoto}
                  style={{ color: (!!uploadProgress.fileShare1 || uploadingCroppedPhoto) ? "#9ca3af" : "#2563eb" }}
                >
                  {uploadProgress.fileShare1 ? `Uploading… ${Math.round(uploadProgress.fileShare1)}%` : "Upload"}
                </button>
              </div>
              {profile.fileShare1 && (
                <div className="text-xs text-gray-600 mb-3">
                  📄 Uploaded:{" "}
                  <a href={profile.fileShare1} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {profile.fileShare1Name || "View file"}
                  </a>
                </div>
              )}

              {/* File to Share #2 */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700">File to Share</div>
                <button
                  type="button"
                  onClick={() => fileShare2Ref.current?.click()}
                  className="text-sm underline disabled:opacity-60"
                  disabled={!!uploadProgress.fileShare2 || uploadingCroppedPhoto}
                  style={{ color: (!!uploadProgress.fileShare2 || uploadingCroppedPhoto) ? "#9ca3af" : "#2563eb" }}
                >
                  {uploadProgress.fileShare2 ? `Uploading… ${Math.round(uploadProgress.fileShare2)}%` : "Upload"}
                </button>
              </div>
              {profile.fileShare2 && (
                <div className="text-xs text-gray-600 mb-3">
                  📄 Uploaded:{" "}
                  <a href={profile.fileShare2} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {profile.fileShare2Name || "View file"}
                  </a>
                </div>
              )}

              {/* File to Share #3 (uses "info" field under the hood) */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700">File to Share</div>
                <button
                  type="button"
                  onClick={() => infoInputRef.current?.click()}
                  className="text-sm underline disabled:opacity-60"
                  disabled={!!uploadProgress.info || uploadingCroppedPhoto}
                  style={{ color: (!!uploadProgress.info || uploadingCroppedPhoto) ? "#9ca3af" : "#2563eb" }}
                >
                  {uploadProgress.info ? `Uploading… ${Math.round(uploadProgress.info)}%` : "Upload"}
                </button>
              </div>
              {profile.info && (
                <div className="text-xs text-gray-600">
                  📄 Uploaded:{" "}
                  <a href={profile.info} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {profile.infoName || "View file"}
                  </a>
                </div>
              )}
            </div>

            {/* Hidden inputs for document uploads */}
            <input
              type="file"
              ref={fileShare1Ref}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,image/*"
              onChange={(e) => handleFileUpload(e, "fileShare1")}
            />
            <input
              type="file"
              ref={fileShare2Ref}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,image/*"
              onChange={(e) => handleFileUpload(e, "fileShare2")}
            />
            <input
              type="file"
              ref={infoInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,image/*"
              onChange={(e) => handleFileUpload(e, "info")}
            />

            {/* Save */}
            <button
              onClick={saveProfile}
              disabled={saving || uploadingCroppedPhoto}
              className="w-full mt-5 py-2 bg-blue-600 text-white rounded flex justify-center items-center disabled:opacity-60"
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

            {/* Photo crop dialog */}
            {croppingPhoto && (
              <Dialog open onClose={() => setCroppingPhoto(null)} fullWidth maxWidth="sm">
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
                      showGrid
                      classes={{ cropAreaClassName: "custom-crop-area" }}
                    />
                    {uploadingCroppedPhoto && (
                      <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600 border-solid" />
                      </div>
                    )}
                    <style jsx global>{`
                      .custom-crop-area {
                        border: 2px solid #2563eb; /* blue-600 */
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
          </>
        )}

        {/* ---------- RESET PASSWORD DIALOG ---------- */}
        {showResetForm && (
          <Dialog open onClose={() => setShowResetForm(false)}>
            <DialogContent>
              <input
                type="email"
                className="w-full mb-4 p-2 rounded border"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleResetPassword}>Send Reset Email</Button>
              <Button onClick={() => setShowResetForm(false)}>Cancel</Button>
            </DialogActions>
          </Dialog>
        )}
      </div>
    </div>
  );
}
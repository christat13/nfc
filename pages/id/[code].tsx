// /pages/id/[code].tsx
// Two-step flow (A create / B edit), photo crop, file uploads, read-only email in step B

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

export default function EditProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const safeCode = Array.isArray(code) ? code[0] : code;

  const [profile, setProfile] = useState<any>({});
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const infoInputRef = useRef<HTMLInputElement>(null);
  const fileShare1Ref = useRef<HTMLInputElement>(null);
  const fileShare2Ref = useRef<HTMLInputElement>(null);

  // wizard step
  const [step, setStep] = useState<"A" | "B">("A");

  // Persist auth
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("[page] mounted", { safeCode });
  }, [safeCode]);

  // If logged in, go to step B; also mirror user email into profile for display
  useEffect(() => {
    if (user) setStep("B");
    if (user?.email) setProfile((p: any) => ({ ...p, email: user.email }));
  }, [user]);

  // Load profile doc (robust)
  useEffect(() => {
    if (!router.isReady || !safeCode) return;
    setLoadingProfile(true);
    setProfileExists(null);

    const fetchProfile = async () => {
      try {
        const docRef = firestoreDoc(db, "profiles", safeCode as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setProfileExists(true);
        } else {
          setProfile({});
          setProfileExists(false);
        }
      } catch (err: any) {
        console.error("[profile] load error:", err?.code || err, err?.message);
        if (err?.code === "permission-denied") {
          toast.error("Can't read profile (permission denied).  Check Firestore rules.");
          setProfile({});
          setProfileExists(false);
        } else {
          toast.error(err?.message || "Failed to load profile");
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [router.isReady, safeCode]);

  // ---------- helpers ----------

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
      setUser(userCred.user);
      setProfile((p: any) => ({ ...p, email: userCred.user.email || email }));
      const ok = await ensureClaim();
      if (ok) setStep("B");
      toast.success("Account created.  Continue below.");
    } catch (err: any) {
      toast.error(err?.message || "Sign-up failed");
    }
  };

  // Claim the code so Storage rules 'isOwner(code)' pass.
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
      toast.success("Profile saved!  Redirecting...");
      setTimeout(() => router.push(`/profile/${safeCode}`), 1500);
    } catch (err: any) {
      toast.error(err.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  // ---------- generic file uploads (file, info, fileShare1, fileShare2) ----------
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    console.log("[file] start", { field, safeCode, user: !!user });
    try {
      if (!safeCode) {
        toast.error("Missing code.");
        return;
      }
      if (!user) {
        toast.error("Please sign in first.");
        return;
      }

      const ok = await ensureClaim();
      if (!ok) return;

      const file = e.target.files?.[0];
      (e.target as HTMLInputElement).value = "";
      if (!file) return;

      const path = `uploads/${safeCode}/${field}/${Date.now()}_${file.name}`;
      const sRef = ref(storage, path);

      setUploadProgress((prev) => ({ ...prev, [field]: 0 }));

      const task = uploadBytesResumable(sRef, file, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=604800",
        customMetadata: { code: String(safeCode), ownerUid: user.uid, originalName: file.name },
      });

      task.on(
        "state_changed",
        (snap: UploadTaskSnapshot) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress((prev) => ({ ...prev, [field]: pct }));
        },
        (err) => {
          console.error("[file upload] error", {
            name: err?.name,
            code: (err as any)?.code,
            message: (err as any)?.message,
            path,
          });
          setUploadProgress((prev) => ({ ...prev, [field]: 0 }));
          toast.error((err as any)?.message || "Upload failed.");
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
          toast.success(`${field === "info" ? "Info" : "File"} uploaded!`);
          setTimeout(() => setUploadProgress((prev) => ({ ...prev, [field]: 0 })), 800);
        }
      );
    } catch (err: any) {
      console.error("[file upload] handler exception", err);
      toast.error(err?.message || "Upload error.");
    }
  };

  // ---------- PHOTO: choose (data URL) ----------
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("Only image files allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCroppingPhoto(reader.result as string); // data URL
      setTimeout(() => cropperRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      toast.success("Image loaded!  Crop before uploading.");
    };
    reader.onerror = () => toast.error("Could not read image file.");
    reader.readAsDataURL(file);

    (e.target as HTMLInputElement).value = "";
  };

  // ---------- PHOTO: upload cropped result ----------
  const uploadCroppedImage = async () => {
    console.log("[photo] start", { safeCode, user: !!user, hasCrop: !!croppedAreaPixels });
    if (!safeCode) {
      toast.error("Missing code.");
      return;
    }
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    if (!croppingPhoto) {
      toast.error("Load a photo first.");
      return;
    }
    if (!croppedAreaPixels) {
      toast.error("Crop the image first.");
      return;
    }

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
      const compressedFile = await imageCompression(fileFromBlob, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      const fileRef = ref(storage, `uploads/${safeCode}/photo_${Date.now()}.jpg`);
      const metadata = { contentType: "image/jpeg", cacheControl: "public, max-age=604800" };

      const task = uploadBytesResumable(fileRef, compressedFile, metadata);

      task.on(
        "state_changed",
        (snap) => {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          setUploadProgress((prev: any) => ({ ...prev, photo: progress }));
        },
        (error) => {
          console.error("[photo] upload error:", error);
          setUploadingCroppedPhoto(false);
          toast.error((error as any)?.message || "Photo upload failed.");
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

  // ---------- Storage smoke test (diagnostic) ----------
  const storageSmokeTest = async () => {
    try {
      if (!safeCode) { toast.error("No code"); return; }
      if (!user)     { toast.error("Sign in first"); return; }

      const ok = await ensureClaim();
      if (!ok) return;

      // Make a 1x1 PNG blob
      const c = document.createElement("canvas");
      c.width = 1; c.height = 1;
      const b: Blob = await new Promise((res) => c.toBlob((bb)=>res(bb as Blob), "image/png"));

      const path = `uploads/${safeCode}/debug/smoke_${Date.now()}.png`;
      console.log("[smoke] about to upload", { path, uid: user.uid });
      const sRef = ref(storage, path);

      const task = uploadBytesResumable(sRef, b, {
        contentType: "image/png",
        cacheControl: "public, max-age=60",
        customMetadata: { code: String(safeCode), ownerUid: user.uid, test: "smoke" },
      });

      task.on("state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          console.log("[smoke] progress", pct);
        },
        (err) => {
          console.error("[smoke] ERROR", { code: (err as any)?.code, message: (err as any)?.message });
          toast.error((err as any)?.message || "Smoke test failed");
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          console.log("[smoke] success URL", url);
          toast.success("Storage smoke test: success");
        }
      );
    } catch (e: any) {
      console.error("[smoke] exception", e);
      toast.error(e?.message || "Smoke test exception");
    }
  };

  // ---------- render ----------

  if (loadingProfile || loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-gray-100 border-2 border-purple-600 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-center">Welcome - Let’s Create Your Profile</h2>

        {/* ---------- STEP A: Create account (new code + logged out) ---------- */}
        {step === "A" && profileExists === false && !user && (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Email<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
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

            <button onClick={handleCreateAccountAndContinue} className="w-full py-2 bg-purple-600 text-white rounded">
              Continue
            </button>
          </>
        )}

        {/* ---------- SIGN IN: Existing profile + logged out ---------- */}
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

            <button onClick={handleSignIn} className="w-full py-2 bg-purple-600 text-white rounded mb-4">
              Sign In
            </button>
          </>
        )}

        {/* ---------- PART B: Everything else (visible when signed in) ---------- */}
        {(step === "B" || !!user) && (
          <>
            {/* Photo */}
            <div className="text-center text-sm font-medium text-gray-700 mb-1 mt-2">Photo</div>
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-600 bg-white">
                {profile.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photoVersion}
                    src={`${profile.photo}${profile.photo.includes("?") ? "&" : "?"}v=${photoVersion}`}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <span className="text-3xl flex justify-center items-center h-full">😊</span>
                )}
              </div>
            </div>

            <label htmlFor="photo-upload" className="block mb-4 text-sm text-blue-500 underline text-center cursor-pointer">
              📷 Tap to Take or Upload Photo
            </label>
            <input id="photo-upload" type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />

            {/* Links */}
            <div className="text-center">
              <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-500 underline mr-4">
                Upload File
              </button>
              <button onClick={() => infoInputRef.current?.click()} className="text-sm text-blue-500 underline" title="Optional PDF or document to accompany your card">
                Upload additional info (PDF, optional)
              </button>
              {/* Diagnostic only */}
              <div className="mt-2">
                <button
                  type="button"
                  className="text-xs text-gray-500 underline"
                  onClick={(e) => {
                    // prove the click is firing *before* any other logic
                    console.log("[ui] smoke button clicked", { target: (e.target as HTMLElement)?.tagName });
                    alert("click");                 // <— you should see this
                    storageSmokeTest();
                  }}
                  onClickCapture={() => console.log("[ui] onClickCapture fired")}
                  style={{ pointerEvents: "auto", zIndex: 10 }}
                >
                  run storage smoke test
                </button>

              </div>
            </div>

            {/* Uploaded file/info display */}
            {profile.file && (
              <div className="text-sm mt-2 text-center text-gray-600">
                📎 File uploaded:{" "}
                <a href={profile.file} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  View File
                </a>
              </div>
            )}
            {profile.info && (
              <div className="text-sm text-center text-gray-600">
                📝 Additional info uploaded:{" "}
                <a href={profile.info} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  View additional info
                </a>
              </div>
            )}

            {/* Files to Share */}
            <div className="mt-6 border-t pt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Files to Share</div>

              <div className="flex flex-col items-center gap-3">
                {/* File to Share #1 */}
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700">File to Share</div>
                  <button
                    type="button"
                    onClick={() => fileShare1Ref.current?.click()}
                    className="text-sm text-blue-600 underline"
                  >
                    {uploadProgress.fileShare1 ? `Uploading… ${Math.round(uploadProgress.fileShare1)}%` : "Upload"}
                  </button>
                </div>

                {profile.fileShare1 && (
                  <div className="w-full text-xs text-gray-600">
                    📄 Uploaded:{" "}
                    <a
                      href={profile.fileShare1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {profile.fileShare1Name || "View file"}
                    </a>
                  </div>
                )}

                {/* File to Share #2 */}
                <div className="w-full flex items-center justify-between gap-3 mt-2">
                  <div className="text-sm text-gray-700">File to Share 2</div>
                  <button
                    type="button"
                    onClick={() => fileShare2Ref.current?.click()}
                    className="text-sm text-blue-600 underline"
                  >
                    {uploadProgress.fileShare2 ? `Uploading… ${Math.round(uploadProgress.fileShare2)}%` : "Upload"}
                  </button>
                </div>

                {profile.fileShare2 && (
                  <div className="w-full text-xs text-gray-600">
                    📄 Uploaded:{" "}
                    <a
                      href={profile.fileShare2}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {profile.fileShare2Name || "View file"}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden inputs */}
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, "file")} />
            <input type="file" ref={infoInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => handleFileUpload(e, "info")} />
            <input type="file" ref={fileShare1Ref} className="hidden" accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => handleFileUpload(e, "fileShare1")} />
            <input type="file" ref={fileShare2Ref} className="hidden" accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => handleFileUpload(e, "fileShare2")} />

            {/* Fields */}
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

            {/* Email read-only in step B */}
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
              className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://instagram.com/yourhandle"
              value={profile.instagram || ""}
              onChange={(e) => setProfile((p: any) => ({ ...p, instagram: e.target.value }))}
            />

            {/* Save */}
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
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600 border-solid" />
                      </div>
                    )}
                    <style jsx global>{`
                      .custom-crop-area {
                        border: 2px solid #ef2828;
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

        {/* ---------- RESET PASSWORD DIALOG (global) ---------- */}
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

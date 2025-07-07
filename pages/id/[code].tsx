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

export default function EditProfile() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [infoFile, setInfoFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!router.isReady || typeof code !== "string") return;

    const fetchProfile = async () => {
      try {
        const refDoc = doc(db, "profiles", code);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router.isReady, code]);

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

  const handleSubmit = async () => {
    if (!code || typeof code !== "string") return;

    const refDoc = doc(db, "profiles", code);
    const updates: any = {
      ...profile,
      lastUpdated: new Date().toISOString(),
      uid: profile.uid || code,
    };

    setSaveStatus("idle");

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
      setSaveStatus("error");
      toast.error("Error saving profile.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-500 bg-white">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold mb-2">Edit Profile</h1>

        {/* Photo preview and upload */}
        <div className="flex flex-col items-center space-y-2">
          {photoPreview || profile.photo ? (
            <img
              src={photoPreview || profile.photo}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center border">
              No Photo
            </div>
          )}
          <button
            type="button"
            onClick={() => document.getElementById("photoInput")?.click()}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
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
          <label className="block text-sm mb-1">Upload Info File</label>
          {profile.info && (
            <a
              href={profile.info}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm block mb-1"
            >
              View current file
            </a>
          )}
          <button
            type="button"
            onClick={() => document.getElementById("infoInput")?.click()}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
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
            <label className="block text-sm mb-1">{field.label}</label>
            <input
              type="text"
              name={field.name}
              value={profile[field.name] || ""}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Save Profile
        </button>

        {saveStatus === "success" && (
          <p className="text-green-600 text-sm mt-1 text-center">
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
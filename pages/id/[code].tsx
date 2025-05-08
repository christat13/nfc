import { useRouter } from "next/router";
import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

type ProfileData = {
  name: string;
  title: string;
  email: string;
  linkedin: string;
  website: string;
  photoURL?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;
  const storage = getStorage();

  const [formData, setFormData] = useState<ProfileData>({
    name: "",
    title: "",
    email: "",
    linkedin: "",
    website: "",
    photoURL: "",
  });

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (typeof window === "undefined" || !code) return;
      const docRef = doc(db, "profiles", code as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFormData(docSnap.data() as ProfileData);
      }
    };
    loadProfile();
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    let photoURL = formData.photoURL;

    if (file) {
      setUploading(true);
      const imageRef = ref(storage, `profile_photos/${code}`);
      await uploadBytes(imageRef, file);
      photoURL = await getDownloadURL(imageRef);
      setUploading(false);
    }

    const updatedProfile = { ...formData, photoURL };
    const docRef = doc(db, "profiles", code as string);
    await setDoc(docRef, updatedProfile);

    router.push(`/profile/${code}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-4 py-8 space-y-6 tron-grid animate-grid">
      <Image src="/logo.png" alt="TLDz Logo" width={80} height={30} />
      <h1 className="text-3xl font-bold text-cyan-400">NFC Profile Code</h1>
      <p className="text-xl bg-blue-100 px-4 py-2 rounded shadow z-10">Profile: {code}</p>
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

        {/* 👇 File Upload */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full px-2 py-1 border border-cyan-400 rounded"
        />

        {/* 👇 Preview */}
        {file && (
          <p className="text-sm text-cyan-700">
            Selected: {file.name}
          </p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded"
        >
          {uploading ? "Uploading..." : "Save Profile"}
        </button>
      </form>
      <p className="text-sm text-cyan-300 z-10">Scan, claim, or share your profile</p>
    </div>
  );
}


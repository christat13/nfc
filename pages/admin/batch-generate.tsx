import { useState } from "react";
import Papa from "papaparse";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

interface ProfileRow {
  code: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  uid?: string;
}

export default function BatchGenerate() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) {
      toast.error("❌ No file selected");
      return;
    }

    if (!uploaded.name.endsWith(".csv")) {
      toast.error("⚠️ Please upload a .csv file");
      return;
    }

    setFile(uploaded);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    Papa.parse<ProfileRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setLoading(true);
          const rows = results.data as ProfileRow[];
          let createdCount = 0;
          let skippedCount = 0;

          for (const row of rows) {
            const code = row.code?.trim();
            if (!code) continue;

            const ref = doc(db, "profiles", code);
            const existing = await getDoc(ref);
            if (existing.exists()) {
              skippedCount++;
              continue;
            }

            const uid = row.uid?.trim() || crypto.randomUUID();

            await setDoc(ref, {
              code,
              firstName: row.firstName?.trim() || "",
              lastName: row.lastName?.trim() || "",
              title: row.title?.trim() || "",
              company: row.company?.trim() || "",
              email: row.email?.trim() || "",
              phone: row.phone?.trim() || "",
              website: row.website?.trim() || "",
              linkedin: row.linkedin?.trim() || "",
              uid,
              photoURL: "",
              createdAt: serverTimestamp(),
            });

            createdCount++;
          }

          toast.success(`✅ Created ${createdCount}, skipped ${skippedCount}`);
        } catch (err) {
          console.error("🔥 Error saving profiles:", err);
          toast.error("Upload failed");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("❌ PapaParse failed:", err);
        toast.error("CSV parsing failed");
      },
    });
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4 text-center">
      <h1 className="text-2xl font-bold">📦 Batch Upload Profiles</h1>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="border p-2 w-full"
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Uploading..." : "Upload and Save"}
      </button>
    </div>
  );
}


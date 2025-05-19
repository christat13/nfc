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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error("❌ No file selected");
      return;
    }

    if (!file.name.endsWith(".csv")) {
      toast.error("⚠️ Please upload a .csv file");
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
            if (!code) {
              console.warn("⛔ Skipping row with missing code:", row);
              continue;
            }

            const ref = doc(db, "profiles", code);
            const existing = await getDoc(ref);
            if (existing.exists()) {
              console.log(`⏭️ Skipping duplicate: ${code}`);
              skippedCount++;
              continue;
            }

            // 🔑 If uid missing, generate one
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
              uid, // ✅ ensures uid is stored
              photoURL: "",
              createdAt: serverTimestamp(),
            });

            console.log(`✅ Created profile: ${code}`);
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
        onChange={handleFileUpload}
        className="border p-2 w-full"
      />
      {loading && <p className="text-gray-600">⏳ Uploading profiles...</p>}
    </div>
  );
}

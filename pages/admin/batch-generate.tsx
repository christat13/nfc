// FILE: /pages/admin/batch-generate.tsx

import { useState } from "react";
import Papa from "papaparse";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
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
}

export default function BatchGenerate() {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.warn("No file selected.");
      return;
    }

    console.log("📁 File selected:", file.name);

    Papa.parse<ProfileRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setLoading(true);
          const rows = results.data as ProfileRow[];
          console.log("📊 Parsed rows:", rows);

          let createdCount = 0;

          for (const row of rows) {
            const code = row.code?.trim();
            if (!code) {
              console.warn("⛔ Skipping row with missing code:", row);
              continue;
            }

            await setDoc(doc(db, "profiles", code), {
              ...row,
              code,
              createdAt: serverTimestamp(),
            });

            console.log(`✅ Created profile: ${code}`);
            createdCount++;
          }

          toast.success(`✅ Created ${createdCount} profiles`);
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
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">📦 Batch Upload Profiles</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {loading && <p>⏳ Uploading profiles...</p>}
    </div>
  );
}


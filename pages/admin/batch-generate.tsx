import { useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

type CsvRow = {
  code?: string;
  keyword?: string;
  pin?: string;
  [key: string]: any;
};

export default function BatchGenerate() {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: ParseResult<CsvRow>) => {
        try {
          setLoading(true);
          const rows = results.data;

          for (const row of rows) {
            const code = row.code || row.keyword || row.pin;
            if (!code) continue;

            await setDoc(doc(db, "profiles", code), {
              code,
              createdAt: serverTimestamp(),
              ...row
            });
          }

          toast.success("All profiles created!");
        } catch (err) {
          console.error("Error saving profiles:", err);
          toast.error("Failed to generate profiles");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Batch Create Profiles</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {loading && <p>Saving profiles...</p>}
    </div>
  );
}

// FILE: /pages/id/[code].tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ClaimRedirect() {
  const router = useRouter();
  const { code } = router.query;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkClaimed = async () => {
      if (!code || typeof code !== "string") return;

      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists() && snap.data()?.uid) {
          router.replace(`/profile/${code}`);
        } else {
          router.replace(`/setup/${code}`);
        }
      } catch (err) {
        console.error("Error checking profile:", err);
        router.replace(`/setup/${code}`);
      } finally {
        setLoading(false);
      }
    };

    checkClaimed();
  }, [code]);

  return (
    <p className="p-6 text-center">
      {loading ? "Checking pin status..." : "Redirecting..."}
    </p>
  );
}

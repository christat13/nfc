import { useEffect } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function IdRedirect() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!code || typeof code !== "string") {
      console.warn("❌ Invalid code:", code);
      return;
    }

    const checkProfile = async () => {
      console.log("🔍 Checking Firestore for code:", code);

      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log("✅ Document found:", data);

          if (data?.uid) {
            console.log("🔁 Redirecting to profile:", `/profile/${code}`);
            router.replace(`/profile/${code}`);
          } else {
            console.log("⚠️ Document found but missing uid. Redirecting to setup.");
            router.replace(`/setup/${code}`);
          }
        } else {
          console.log("❌ Document not found. Redirecting to setup.");
          router.replace(`/setup/${code}`);
        }
      } catch (err) {
        console.error("🔥 Error during redirect:", err);
        router.replace(`/setup/${code}`);
      }
    };

    checkProfile();
  }, [code, router]);

  return <p className="text-center p-6">Checking pin status...</p>;
}

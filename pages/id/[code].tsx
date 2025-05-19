import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function IdRedirect() {
  const router = useRouter();
  const { code } = router.query;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    const checkProfile = async () => {
      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log("✅ Document found:", data);

          if (typeof data.uid === "string" && data.uid.trim() !== "") {
            toast.success("🔒 Already claimed. Redirecting...");
            router.replace(`/profile/${code}`);
          } else {
            toast("🆕 Unclaimed pin — directing to setup...");
            router.replace(`/setup/${code}`);
          }
        } else {
          toast("🆕 No profile found — directing to setup...");
          router.replace(`/setup/${code}`);
        }
      } catch (err) {
        console.error("❌ Error checking profile:", err);
        toast.error("Error loading pin.");
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [router.isReady, code]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center text-gray-600">
      {loading ? (
        <>
          <svg
            className="animate-spin h-8 w-8 text-blue-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p>Checking pin status...</p>
        </>
      ) : (
        <p>Redirecting...</p>
      )}
    </div>
  );
}

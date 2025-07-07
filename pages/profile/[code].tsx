import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function PublicProfile() {
  const { code } = useRouter().query;
  const [profile, setProfile] = useState<any>(null);
  const [fullURL, setFullURL] = useState("");

  useEffect(() => {
    if (!code || typeof code !== "string") return;

    setProfile({
      name: "Taylor",
      organization: "TLDz",
    });

    if (typeof window !== "undefined") {
      const currentURL = window?.location?.href || "";
      if (currentURL.startsWith("http")) {
        setFullURL(currentURL);
      } else {
        setFullURL("https://id.tldz.com");
      }
    }
  }, [code]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40 }}>
      <h1>✅ Step 1: useEffect + state</h1>
      <p>Code: {code}</p>
      <p>Name: {profile?.name || "No profile yet"}</p>
      <p>Full URL: {fullURL || "Not set"}</p>
    </div>
  );
}



// This code displays a public profile page for NFC pins, allowing users to view their profile information,
// download a vCard, copy the profile link, and edit their profile if they are the owner. It uses QR codes for easy sharing and updates the profile's viewed timestamp in Firestore when accessed.
// It also handles cases where the profile is unclaimed by redirecting to the edit page.
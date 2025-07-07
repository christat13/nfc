import { useRouter } from "next/router";

export default function PublicProfile() {
  const { code } = useRouter().query;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40 }}>
      <h1>🧪 Minimal Profile Page</h1>
      <p>Router code: {code}</p>
    </div>
  );
}


// This code displays a public profile page for NFC pins, allowing users to view their profile information,
// download a vCard, copy the profile link, and edit their profile if they are the owner. It uses QR codes for easy sharing and updates the profile's viewed timestamp in Firestore when accessed.
// It also handles cases where the profile is unclaimed by redirecting to the edit page.
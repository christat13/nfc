import { useRouter } from 'next/router';

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Your NFC Code</h1>
      <p>This page will load the profile for:</p>
      <code style={{ background: '#f0f0f0', padding: '4px 8px' }}>{code}</code>
    </div>
  );
}


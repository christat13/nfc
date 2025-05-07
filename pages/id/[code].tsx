// 🔷 pages/id/[code].tsx — Tron Profile Editor with Form
import { useRouter } from "next/router";
import Image from "next/image";
import { useState } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const { code } = router.query;

  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    linkedin: "",
    website: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Profile saved! (Functionality coming soon)");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 space-y-6 tron-grid animate-grid">
      <Image
        src="/logo.png"
        alt="TLDz Logo"
        width={180}
        height={70}
        className="mb-4"
      />
      <h1 className="text-3xl font-bold text-cyan-400">NFC Profile Code</h1>
      <p className="text-xl bg-blue-100 px-4 py-2 rounded shadow z-10">Profile: {code}</p>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md z-10">
        <input
          name="name"
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
        <input
          name="title"
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
        <input
          name="linkedin"
          type="url"
          placeholder="LinkedIn URL"
          value={formData.linkedin}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
        <input
          name="website"
          type="url"
          placeholder="Website"
          value={formData.website}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded"
        >
          Save Profile
        </button>
      </form>
      <p className="text-sm text-cyan-300 z-10">Scan, claim, or share your profile</p>
      <style jsx>{`
        @keyframes gridScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100px;
          }
        }
        .tron-grid {
          position: relative;
          overflow: hidden;
        }
        .tron-grid::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image:
            repeating-linear-gradient(#00f0ff 0 2px, transparent 2px 40px),
            repeating-linear-gradient(90deg, #00f0ff 0 2px, transparent 2px 40px);
          transform: rotateX(60deg) scaleY(1.5) translateY(-25%);
          transform-origin: bottom;
          animation: gridScroll 6s linear infinite;
          opacity: 0.2;
          z-index: 0;
        }
        .animate-grid {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}


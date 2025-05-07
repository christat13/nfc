import React, { useState } from "react";

type ProfileData = {
  name: string;
  title: string;
  email: string;
  photo: string;
  linkedin: string;
  website: string;
};

type Props = {
  initialValues?: Partial<ProfileData>;
  onSave: (data: ProfileData) => void;
};


export default function ProfileForm({ initialValues = {}, onSave }: Props) {
  const [formData, setFormData] = useState({
    name: initialValues.name || "",
    title: initialValues.title || "",
    email: initialValues.email || "",
    photo: initialValues.photo || "",
    linkedin: initialValues.linkedin || "",
    website: initialValues.website || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span>Name</span>
        <input
          className="w-full p-2 rounded text-black"
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
      </label>

      <label className="block">
        <span>Title</span>
        <input
          className="w-full p-2 rounded text-black"
          name="title"
          value={formData.title}
          onChange={handleChange}
        />
      </label>

      <label className="block">
        <span>Email</span>
        <input
          className="w-full p-2 rounded text-black"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
      </label>

      <label className="block">
        <span>Photo URL</span>
        <input
          className="w-full p-2 rounded text-black"
          name="photo"
          value={formData.photo}
          onChange={handleChange}
        />
      </label>

      <label className="block">
        <span>LinkedIn</span>
        <input
          className="w-full p-2 rounded text-black"
          name="linkedin"
          value={formData.linkedin}
          onChange={handleChange}
        />
      </label>

      <label className="block">
        <span>Website</span>
        <input
          className="w-full p-2 rounded text-black"
          name="website"
          value={formData.website}
          onChange={handleChange}
        />
      </label>

      <button
        type="submit"
        className="bg-green-500 px-4 py-2 rounded text-white font-bold"
      >
        Save Profile
      </button>
    </form>
  );
}

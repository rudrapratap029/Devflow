import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API, { getAvatarUrl } from "../services/api";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const isCompany = user?.role === "company";

  // Detailed profile stats & activities
  const [fullProfileData, setFullProfileData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Common and Developer form fields
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    github: user?.github || "",
    linkedin: user?.linkedin || "",
    portfolio: user?.portfolio || "",
    // Company specific
    companyName: user?.companyName || user?.name || "",
    companyWebsite: user?.companyWebsite || "",
    companyDescription: user?.companyDescription || user?.bio || "",
    industry: user?.industry || "",
    location: user?.location || "",
    companySize: user?.companySize || "11–50 Employees",
    foundedYear: user?.foundedYear || "",
    hiringStatus: user?.hiringStatus || "Actively Hiring"
  });

  // Skills state management
  const [skills, setSkills] = useState(user?.skills || []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch full live profile details
  const fetchFullProfile = async () => {
    if (!user?._id) return;
    try {
      setLoadingData(true);
      const res = await API.get(`/users/${user._id}`);
      if (res.data?.success && res.data.data) {
        const u = res.data.data;
        setFullProfileData(u);
        setSkills(u.skills || []);
        setFormData({
          name: u.name || "",
          email: u.email || "",
          bio: u.bio || "",
          github: u.github || "",
          linkedin: u.linkedin || "",
          portfolio: u.portfolio || "",
          companyName: u.companyName || u.name || "",
          companyWebsite: u.companyWebsite || "",
          companyDescription: u.companyDescription || u.bio || "",
          industry: u.industry || "",
          location: u.location || "",
          companySize: u.companySize || "11–50 Employees",
          foundedYear: u.foundedYear || "",
          hiringStatus: u.hiringStatus || "Actively Hiring"
        });
      }
    } catch (err) {
      console.warn("Failed to fetch full user profile:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, [user?._id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Add / Remove Skill
  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills([...skills, trimmed]);
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Save profile updates via PUT /users/profile
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      const payload = isCompany
        ? {
            companyName: formData.companyName.trim(),
            companyWebsite: formData.companyWebsite.trim(),
            companyDescription: formData.companyDescription.trim(),
            industry: formData.industry.trim(),
            location: formData.location.trim(),
            companySize: formData.companySize.trim(),
            foundedYear: formData.foundedYear.trim(),
            hiringStatus: formData.hiringStatus.trim(),
            skills: skills
          }
        : {
            name: formData.name.trim(),
            bio: formData.bio.trim(),
            github: formData.github.trim(),
            linkedin: formData.linkedin.trim(),
            portfolio: formData.portfolio.trim(),
            skills: skills
          };

      const res = await API.put("/users/profile", payload);
      if (res.data?.success) {
        const updatedUser = res.data.data?.user || { ...user, ...payload };
        updateUser(updatedUser);
        setMessage({
          type: "success",
          text: isCompany ? "Company profile updated successfully!" : "Developer profile saved successfully!"
        });
        fetchFullProfile();
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update profile. Please try again."
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Photo / Logo management
  const handleFileChange = (e) => {
    setMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".jpg", ".jpeg", ".png"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!validExtensions.includes(ext)) {
      setMessage({
        type: "error",
        text: "Please select a JPG, JPEG, or PNG image file."
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "Image file exceeds the 5 MB limit."
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setMessage(null);

    try {
      const uploadPayload = new FormData();
      uploadPayload.append("profilePicture", selectedFile);
      uploadPayload.append("avatar", selectedFile);

      const res = await API.put("/users/profile-picture", uploadPayload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        const newUrl = res.data.data?.avatar || res.data.data?.profilePicture;
        updateUser({ ...user, avatar: newUrl, profilePicture: newUrl, companyLogo: newUrl });
        setMessage({
          type: "success",
          text: isCompany ? "Company logo updated successfully!" : "Profile photo updated successfully!"
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to upload image."
      });
    } finally {
      setUploading(false);
      handleCancelPreview();
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      setMessage(null);
      const res = await API.delete("/users/profile-picture");
      if (res.data?.success) {
        updateUser({ ...user, avatar: "", profilePicture: "", companyLogo: "" });
        setMessage({
          type: "success",
          text: isCompany ? "Company logo removed." : "Profile photo removed."
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to remove photo."
      });
    } finally {
      setUploading(false);
    }
  };

  // Metrics derived from fullProfileData
  const companyStats = fullProfileData?.companyStats || {
    openProjects: 0,
    completedProjects: 0,
    activeDevelopers: 0
  };

  const devTaskStats = fullProfileData?.taskStats || {
    current: 0,
    completed: 0,
    pending: 0
  };

  const recentActivities = fullProfileData?.recentActivities || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ============================================================== */}
      {/* PAGE HEADER */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isCompany ? "Company Profile" : "Developer Profile"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isCompany
              ? "Manage official organization credentials, hiring details, and project engineering criteria"
              : "Showcase technical skills, portfolio links, and sprint task history"}
          </p>
        </div>

        {/* Verification Status Badge */}
        {isCompany && (
          <div className="shrink-0">
            {user?.verificationStatus === "Approved" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-2xs">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                <span>Verified Company</span>
              </span>
            ) : user?.verificationStatus === "Rejected" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>Verification Rejected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Pending Verification</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between border shadow-2xs ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* ============================================================== */}
      {/* COMPANY PROFILE DEDICATED VIEW */}
      {/* ============================================================== */}
      {isCompany ? (
        <div className="space-y-6">
          {/* 1. Company Identity Card */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              {/* Company Logo Display & Actions */}
              <div className="flex flex-col items-center sm:items-start space-y-2.5 shrink-0">
                <div className="relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Logo Preview"
                      className="w-24 h-24 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border-2 border-indigo-500 shadow-sm p-1"
                    />
                  ) : user?.companyLogo || user?.avatar ? (
                    <img
                      src={getAvatarUrl(user.companyLogo || user.avatar)}
                      alt={formData.companyName || "Company Logo"}
                      className="w-24 h-24 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm p-1"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-3xl font-bold border border-indigo-200 dark:border-indigo-800 shadow-sm">
                      {(formData.companyName || "C").charAt(0).toUpperCase()}
                    </div>
                  )}

                  {previewUrl && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={uploading}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      {uploading ? "Saving..." : "Save Logo"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelPreview}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      {user?.companyLogo || user?.avatar ? "Change Logo" : "Upload Logo"}
                    </button>
                    {(user?.companyLogo || user?.avatar) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        className="px-2 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-slate-400">JPG, PNG (Max 5 MB)</span>
              </div>

              {/* Company Header Info */}
              <div className="text-center sm:text-left space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formData.companyName || "Organization"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {formData.industry || "Software & Technology"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 justify-center sm:justify-start pt-1">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span>{user?.email}</span>
                  </span>

                  {formData.location && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{formData.location}</span>
                    </span>
                  )}

                  {formData.companyWebsite && (
                    <a
                      href={formData.companyWebsite.startsWith("http") ? formData.companyWebsite : `https://${formData.companyWebsite}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" x2="22" y1="12" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span>{formData.companyWebsite.replace(/^https?:\/\//, "")}</span>
                    </a>
                  )}
                </div>

                {/* Hiring Status Tag */}
                <div className="pt-2 flex items-center gap-2 justify-center sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {formData.hiringStatus}
                  </span>
                  {formData.companySize && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                      {formData.companySize}
                    </span>
                  )}
                  {formData.foundedYear && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                      Est. {formData.foundedYear}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Company Performance Overview (3 stats cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Open Projects
                </span>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {loadingData ? "..." : companyStats.openProjects}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Currently accepting developer applications</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Completed Projects
                </span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {loadingData ? "..." : companyStats.completedProjects}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Delivered and verified milestones</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Developers
                </span>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {loadingData ? "..." : companyStats.activeDevelopers}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Contracted engineers collaborating</p>
              </div>
            </div>
          </div>

          {/* 3. Company Profile Edit Form */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              <span>Organization Details & Hiring Requirements</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="Acme Technologies Inc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Industry *
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="FinTech, Cloud Infrastructure, AI"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Company Description
                </label>
                <textarea
                  name="companyDescription"
                  value={formData.companyDescription}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="Overview of your company mission, products, and developer culture..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Website URL
                  </label>
                  <input
                    type="url"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="https://acme.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Location / Headquarters
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="e.g. San Francisco, CA or Remote"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Hiring Status
                  </label>
                  <select
                    name="hiringStatus"
                    value={formData.hiringStatus}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="Actively Hiring">Actively Hiring</option>
                    <option value="Open for Collaboration">Open for Collaboration</option>
                    <option value="Selective Hiring">Selective Hiring</option>
                    <option value="Hiring Paused">Hiring Paused</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Company Size (Optional)
                  </label>
                  <select
                    name="companySize"
                    value={formData.companySize}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="1–10 Employees">1–10 Employees</option>
                    <option value="11–50 Employees">11–50 Employees</option>
                    <option value="51–200 Employees">51–200 Employees</option>
                    <option value="201–500 Employees">201–500 Employees</option>
                    <option value="500+ Employees">500+ Employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Founded Year (Optional)
                  </label>
                  <input
                    type="text"
                    name="foundedYear"
                    value={formData.foundedYear}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="e.g. 2021"
                  />
                </div>
              </div>

              {/* Required Skills for Organization */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Primary Tech Stack & Required Skills
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="e.g. React, Node.js, AWS, Kubernetes"
                    className="flex-1 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-white"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No required skills listed yet</span>
                  )}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {savingProfile ? "Saving Profile..." : "Save Company Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* DEVELOPER PROFILE VIEW (DEVELOPER / ADMIN) */
        /* ============================================================== */
        <div className="space-y-6">
          {/* 1. Developer Header Card */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              {/* Profile Picture Display & Actions */}
              <div className="flex flex-col items-center sm:items-start space-y-2.5 shrink-0">
                <div className="relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Avatar Preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                    />
                  ) : user?.avatar || user?.profilePicture ? (
                    <img
                      src={getAvatarUrl(user.avatar || user.profilePicture)}
                      alt={formData.name || "User Avatar"}
                      className="w-24 h-24 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800 shadow-sm"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-3xl font-bold border-2 border-indigo-200 dark:border-indigo-800 shadow-sm">
                      {(formData.name || "D").charAt(0).toUpperCase()}
                    </div>
                  )}

                  {previewUrl && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={uploading}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      {uploading ? "Saving..." : "Save Photo"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelPreview}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      {user?.avatar || user?.profilePicture ? "Change Photo" : "Upload Photo"}
                    </button>
                    {(user?.avatar || user?.profilePicture) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        className="px-2 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-slate-400">JPG, PNG (Max 5 MB)</span>
              </div>

              {/* Developer Basic Info */}
              <div className="text-center sm:text-left space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formData.name || "Developer"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {user?.role || "Developer"}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 justify-center sm:justify-start">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span>{user?.email}</span>
                </p>

                {/* Developer Bio Preview */}
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-1 italic line-clamp-2">
                  {formData.bio ? `"${formData.bio}"` : "No bio added yet. Add a professional summary below."}
                </p>

                {/* Social links preview */}
                <div className="flex flex-wrap items-center gap-3 pt-2 justify-center sm:justify-start text-xs font-medium">
                  {formData.github && (
                    <a
                      href={formData.github.startsWith("http") ? formData.github : `https://${formData.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      <span>GitHub</span>
                    </a>
                  )}
                  {formData.linkedin && (
                    <a
                      href={formData.linkedin.startsWith("http") ? formData.linkedin : `https://${formData.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                      </svg>
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {formData.portfolio && (
                    <a
                      href={formData.portfolio.startsWith("http") ? formData.portfolio : `https://${formData.portfolio}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" x2="22" y1="12" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span>Portfolio</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Developer Task Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Current Tasks
                </span>
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                  {loadingData ? "..." : devTaskStats.current || devTaskStats.inProgress || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tasks currently in development</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Completed Tasks
                </span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {loadingData ? "..." : devTaskStats.completed || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Delivered sprint items</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pending Tasks
                </span>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {loadingData ? "..." : devTaskStats.pending || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Assigned tasks awaiting start</p>
              </div>
            </div>
          </div>

          {/* 3. Developer Profile Form (Bio, Skills, Links) */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              <span>Developer Professional Bio & Portfolio Links</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="Alex Johnson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Professional Bio (Max 500 characters)
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  maxLength={500}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="Full stack developer with 3+ years experience building scalable React and Node.js applications..."
                />
                <span className="text-[11px] text-slate-400">{formData.bio.length} / 500 characters</span>
              </div>

              {/* Developer Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    GitHub Profile URL
                  </label>
                  <input
                    type="text"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="https://github.com/username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="text"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Portfolio Website
                  </label>
                  <input
                    type="text"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="https://alexjohnson.dev"
                  />
                </div>
              </div>

              {/* Technical Skills Manager */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Technical Skills & Frameworks
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="e.g. React, TypeScript, Node.js, Express, MongoDB"
                    className="flex-1 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-white"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No skills added yet</span>
                  )}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {savingProfile ? "Saving Profile..." : "Save Developer Profile"}
                </button>
              </div>
            </form>
          </div>

          {/* 4. Recent Activity Timeline */}
          {recentActivities.length > 0 && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span>Recent Sprint Activity</span>
              </h3>

              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div
                    key={act._id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {act.description || act.action}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(act.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. THEME PREFERENCES (COMMON TO ALL) */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          Workspace Appearance
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Select interface contrast mode
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
              theme === "light"
                ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Light Mode</p>
                <p className="text-xs text-slate-400">Clean surfaces</p>
              </div>
            </div>
            {theme === "light" && <span className="text-indigo-600 font-bold">✓</span>}
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
              theme === "dark"
                ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Dark Mode</p>
                <p className="text-xs text-slate-400">Low-glare palette</p>
              </div>
            </div>
            {theme === "dark" && <span className="text-indigo-600 font-bold">✓</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

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

  // Skills state management
  const [skills, setSkills] = useState(user?.skills || []);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillError, setSkillError] = useState("");

  // Professional Bio state management
  const [bio, setBio] = useState(user?.bio || "");
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState("");

  // Sync skills and bio when user object updates
  useEffect(() => {
    if (user?.skills && Array.isArray(user.skills)) {
      setSkills(user.skills);
    }
    if (user?.bio !== undefined) {
      setBio(user.bio || "");
    }
  }, [user?.skills, user?.bio]);

  // Save professional bio via PUT /users/profile
  const handleSaveBio = async (e) => {
    if (e) e.preventDefault();
    setSavingBio(true);
    setBioError("");
    setMessage(null);

    const trimmed = bio.trim();
    if (trimmed.length > 500) {
      setBioError("Bio cannot exceed 500 characters");
      setSavingBio(false);
      return;
    }

    try {
      const res = await API.put("/users/profile", { bio: trimmed });
      if (res.data?.success) {
        const updatedUserData = res.data.data?.user || { ...user, bio: trimmed };
        updateUser(updatedUserData);
        setMessage({
          type: "success",
          text: "Professional bio saved successfully!"
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save bio. Please try again."
      });
    } finally {
      setSavingBio(false);
    }
  };

  // Add a new skill
  const handleAddSkill = (e) => {
    e.preventDefault();
    setSkillError("");

    const trimmed = newSkillInput.trim();
    if (!trimmed) {
      setSkillError("Skill cannot be empty");
      return;
    }

    // Check for duplicates (case-insensitive)
    const exists = skills.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setSkillError("This skill is already added");
      return;
    }

    setSkills([...skills, trimmed]);
    setNewSkillInput("");
  };

  // Remove a skill
  const handleRemoveSkill = (indexToRemove) => {
    setSkillError("");
    setSkills(skills.filter((_, idx) => idx !== indexToRemove));
    if (editingIndex === indexToRemove) {
      setEditingIndex(null);
      setEditValue("");
    }
  };

  // Start inline editing of a skill
  const handleStartEdit = (index) => {
    setSkillError("");
    setEditingIndex(index);
    setEditValue(skills[index] || "");
  };

  // Save inline edit of a skill
  const handleSaveEdit = (index) => {
    setSkillError("");
    const trimmed = editValue.trim();
    if (!trimmed) {
      setSkillError("Skill cannot be empty");
      return;
    }

    // Check for duplicate with other existing skills
    const exists = skills.some(
      (s, idx) => idx !== index && s.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setSkillError("Another skill with this name already exists");
      return;
    }

    const updated = [...skills];
    updated[index] = trimmed;
    setSkills(updated);
    setEditingIndex(null);
    setEditValue("");
  };

  // Save skills to backend via PUT /users/profile
  const handleSaveSkills = async () => {
    setSavingSkills(true);
    setSkillError("");
    setMessage(null);

    try {
      const res = await API.put("/users/profile", { skills });
      if (res.data?.success) {
        const updatedUserData = res.data.data?.user || { ...user, skills };
        updateUser(updatedUserData);
        setMessage({
          type: "success",
          text: "Skills saved successfully!"
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save skills. Please try again."
      });
    } finally {
      setSavingSkills(false);
    }
  };

  // Handle selecting an image file (JPG, JPEG, PNG, max 5 MB)
  const handleFileChange = (e) => {
    setMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Supported formats validation
    const validExtensions = [".jpg", ".jpeg", ".png"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const validMime = ["image/jpeg", "image/png", "image/jpg"].includes(file.type);

    if (!validExtensions.includes(ext) && !validMime) {
      setMessage({
        type: "error",
        text: "Invalid file format. Please select a JPG, JPEG, or PNG image."
      });
      return;
    }

    // 5 MB max limit
    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "File size exceeds the 5 MB limit. Please select a smaller image."
      });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Cancel selected preview
  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Upload and apply selected profile picture
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("profilePicture", selectedFile);
      formData.append("avatar", selectedFile);

      const res = await API.put("/users/profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        const updatedAvatar = res.data.data?.avatar || res.data.data?.profilePicture;
        const updatedUserData = res.data.data?.user || { avatar: updatedAvatar, profilePicture: updatedAvatar };
        updateUser(updatedUserData);
        setMessage({
          type: "success",
          text: res.data.message || "Profile picture updated successfully!"
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to upload profile picture. Please try again."
      });
    } finally {
      setUploading(false);
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove current profile photo
  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      setMessage(null);
      const res = await API.delete("/users/profile-picture");
      if (res.data?.success) {
        updateUser({ avatar: "", profilePicture: "" });
        setMessage({
          type: "success",
          text: "Profile photo removed successfully."
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to remove profile photo."
      });
    } finally {
      setUploading(false);
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">User Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage and review your DevFlow account details
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Top Profile Header: Avatar & Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
          {/* Avatar display & actions */}
          <div className="flex flex-col items-center sm:items-start space-y-2.5 shrink-0">
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Avatar Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                />
              ) : user?.avatar ? (
                <img
                  src={getAvatarUrl(user.avatar)}
                  alt={user.name || "User Avatar"}
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800 shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-3xl font-bold border-2 border-indigo-200 dark:border-indigo-800 shadow-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              {previewUrl && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                  Preview
                </span>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Action Buttons */}
            {previewUrl ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
                >
                  {uploading ? "Saving..." : "Save Photo"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPreview}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-600 shadow-2xs"
                >
                  {user?.avatar ? "Change Photo" : "Upload Photo"}
                </button>
                {user?.avatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="px-2 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition-colors disabled:opacity-50"
                    title="Remove profile photo"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              JPG, JPEG or PNG (Max 5 MB)
            </p>
          </div>

          {/* User Basic Info */}
          <div className="text-center sm:text-left space-y-1 sm:pt-2 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {user?.name || "Developer"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || "No email"}</p>
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {user?.role || "Developer"}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-start justify-between border ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                : message.type === "info"
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400"
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-3 font-semibold hover:opacity-75"
            >
              ✕
            </button>
          </div>
        )}

        {/* Detailed Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Full Name
            </p>
            <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white mt-1">
              {user?.name || "Not provided"}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Email Address
            </p>
            <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white mt-1">
              {user?.email || "Not provided"}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account Role
            </p>
            <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white mt-1 capitalize">
              {user?.role || "Developer"}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account Status
            </p>
            <p className="text-sm sm:text-base font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {user?.isActive !== false ? "Active" : "Inactive"}
            </p>
          </div>
        </div>

        {/* Professional Bio Section */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Professional Bio</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Describe your technical focus, interests, and preferred work to help Admin and Managers assign suitable tasks
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveBio}
              disabled={savingBio}
              className="self-start sm:self-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {savingBio ? "Saving..." : "Save Bio"}
            </button>
          </div>

          {bioError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {bioError}
            </p>
          )}

          <div>
            <textarea
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                if (bioError) setBioError("");
              }}
              maxLength={500}
              rows={3}
              placeholder="e.g. I enjoy building scalable backend APIs with Node.js and MongoDB. Interested in performance optimization and clean REST architectures..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs resize-none"
            />
            <div className="flex justify-end mt-1">
              <span
                className={`text-[11px] ${
                  bio.length > 450
                    ? "text-amber-600 font-semibold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {bio.length} / 500 characters
              </span>
            </div>
          </div>
        </div>

        {/* Skills Management Section */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Skills</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({skills.length} added)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add, edit, or remove professional skills to help Admin and Managers assign relevant tasks
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveSkills}
              disabled={savingSkills}
              className="self-start sm:self-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {savingSkills ? "Saving..." : "Save Skills"}
            </button>
          </div>

          {/* Validation Error Message */}
          {skillError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-2.5 rounded-lg flex items-center justify-between">
              <span>{skillError}</span>
              <button
                type="button"
                onClick={() => setSkillError("")}
                className="font-bold hover:opacity-75"
              >
                ✕
              </button>
            </div>
          )}

          {/* Skills Badges List */}
          <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 min-h-[52px]">
            {skills.length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                No skills added yet. Add your professional skills below.
              </span>
            ) : (
              skills.map((skill, index) => {
                const isEditing = editingIndex === index;
                if (isEditing) {
                  return (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-indigo-500 shadow-2xs"
                    >
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(index);
                          }
                          if (e.key === "Escape") {
                            setEditingIndex(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                        className="w-24 sm:w-28 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs font-bold px-1"
                        title="Save edit"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null);
                          setEditValue("");
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-1"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  );
                }

                return (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs group"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(index)}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors ml-0.5"
                      title="Edit skill"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-0.5"
                      title="Remove skill"
                    >
                      ✕
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Add Skill Input Form */}
          <form onSubmit={handleAddSkill} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newSkillInput}
              onChange={(e) => {
                setNewSkillInput(e.target.value);
                if (skillError) setSkillError("");
              }}
              placeholder="e.g. React, Node.js, Express.js, MongoDB"
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs flex-1 max-w-sm"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600 shadow-2xs whitespace-nowrap"
            >
              + Add Skill
            </button>
          </form>
        </div>

        {/* Theme Preference Section */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Interface Theme
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                theme === "light"
                  ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">☀️</span>
                <div>
                  <p className="text-sm font-semibold">Light Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Clean white and slate surfaces</p>
                </div>
              </div>
              {theme === "light" && (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">✓</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                theme === "dark"
                  ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                  : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">🌙</span>
                <div>
                  <p className="text-sm font-semibold">Dark Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Easy on the eyes in low light</p>
                </div>
              </div>
              {theme === "dark" && (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">✓</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

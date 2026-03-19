import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { API_BASE } from "../lib/constants";

const ContactPage = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    printerBrand: "",
    issueType: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, phone: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          printerBrand: formData.printerBrand,
          issueType: formData.issueType || "other",
          source: "contact_form",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Submission failed. Please try again.");
      }

      setSuccess(true);
      setFormData({ name: "", email: "", phone: "", message: "", printerBrand: "", issueType: "" });

      // Auto-close after 3 seconds on success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ zIndex: 99999 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 sm:px-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="contactModal"
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative w-full max-w-4xl bg-white rounded-2xl px-6 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-8 flex flex-col lg:flex-row gap-6 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black/70 hover:text-black text-xl z-10 cursor-pointer"
        >
          ✕
        </button>

        {/* LEFT IMAGE */}
        <div className="w-full lg:w-[400px] h-[260px] lg:h-auto lg:self-stretch">
          <motion.img
            src="/contact.png"
            alt="Printer Support"
            className="w-full h-full object-cover rounded-[24px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          />
        </div>

        {/* RIGHT FORM */}
        <div className="flex-1 overflow-y-auto pr-1">
          <h2 className="text-[28px] font-semibold text-black mb-2">
            Having trouble with your printer?
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Please provide details about the issue you are experiencing with
            your printer. Our technical support team will review your complaint
            and contact you promptly to assist.
          </p>

          {/* Success message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium"
            >
              ✅ Your query has been submitted! Our team will contact you shortly.
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
            >
              ⚠ {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Printer Brand */}
            <div>
              <label className="text-sm font-medium text-black">Printer Model</label>
              <select
                name="printerBrand"
                value={formData.printerBrand}
                onChange={handleChange}
                required
                className="mt-1 w-full h-[46px] border border-gray-300 rounded-lg px-4 text-sm outline-none focus:ring-1 focus:ring-[#5695D0] focus:border-[#5695D0] transition"
              >
                <option value="">Select your printer </option>
                <option>HP LaserJet Pro MFP M126nw</option>
                <option>HP LaserJet Pro M404dn</option>
                <option>HP LaserJet Pro MFP M227fdw</option>
                <option>HP DeskJet 2331</option>
                <option>HP DeskJet Ink Advantage 2776</option>
                <option>HP Ink Tank 315</option>
                <option>HP Ink Tank 419</option>
                <option>HP Smart Tank 515</option>
                <option>HP Smart Tank 720</option>
                <option>HP OfficeJet Pro 8025</option>
                <option>HP OfficeJet Pro 9015</option>
                <option>HP LaserJet 1020 Plus</option>
                <option>HP LaserJet Pro M1136</option>
                <option>HP Neverstop Laser 1000w</option>
              </select>
            </div>

            {/* Printer Issue */}
            <div>
              <label className="text-sm font-medium text-black">Printer Issue</label>
              <select
                name="issueType"
                value={formData.issueType}
                onChange={handleChange}
                required
                className="mt-1 w-full h-[46px] border border-gray-300 rounded-lg px-4 text-sm outline-none focus:ring-1 focus:ring-[#5695D0] focus:border-[#5695D0] transition"
              >
                <option value="">Select the issue you're facing</option>
                <option value="hardware">Paper Jam</option>
                <option value="ink">Ink Issue</option>
                <option value="connectivity">Not Printing / Offline</option>
                <option value="driver">Driver Issue</option>
                <option value="installation">Installation</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Full Name */}
            <div>
              <label className="text-sm font-medium text-black">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="mt-1 w-full h-[46px] border border-gray-300 rounded-lg px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#5695D0] focus:border-[#5695D0] transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-black">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                className="mt-1 w-full h-[46px] border border-gray-300 rounded-lg px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#5695D0] focus:border-[#5695D0] transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-black">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="Enter your contact number"
                maxLength={15}
                className="mt-1 w-full h-[46px] border border-gray-300 rounded-lg px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#5695D0] focus:border-[#5695D0] transition"
              />
            </div>

            {/* Complaint */}
            <div>
              <label className="text-sm font-medium text-black">Complaint Details</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Describe the issue in detail..."
                rows="4"
                required
                className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#5695D0] focus:border-[#5695D0] transition"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-[48px] rounded-lg text-white text-sm font-medium transition cursor-pointer ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#5B9BD5] hover:bg-[#4A8AC4]"
                }`}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.section>,
    document.body
  );
};

export default ContactPage;
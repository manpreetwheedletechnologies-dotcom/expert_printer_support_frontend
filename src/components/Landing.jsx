import React, { useState } from "react";

const PrinterSupportHero = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone))
      newErrors.phone = "Phone number must be 10 digits";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email))
      newErrors.email = "Enter a valid email address";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      const response = await fetch("https://your-api-endpoint.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to submit");
      setFormData({ name: "", phone: "", email: "", message: "" });
      setShowPopup(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkmarks = [
    "24/7 AI Chatbot Support",
    "Fast Issue Resolution Time",
    "High First-Contact Resolution Rate",
    "Customer Satisfaction-Driven Support",
  ];

  const inputClass =
    "w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5695D0] focus:border-[#5695D0] transition";

  return (
    <>
      <section
        id="printer-support-hero"
        className="relative pt-10 min-h-screen flex items-center overflow-hidden"
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/home_bg.png")' }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Content wrapper */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* ── LEFT: Text content ── */}
            <div className="text-white space-y-5 sm:space-y-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                Reliable Printer Troubleshooting &amp; Support Services
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-gray-200 leading-relaxed">
                Expert Printer is a recognized name in online printer support
                and troubleshooting, trusted by users across the USA for
                dependable and secure assistance. We specialize in resolving
                common and complex printer issues, including driver updates,
                connectivity errors, paper jams, offline problems, and
                performance-related concerns. Our AI-Powered Printer Online Help
                Desk combines intelligent chatbot support with expert guidance
                to deliver fast and effective solutions.
              </p>

              <ul className="space-y-2.5 sm:space-y-3 pt-1">
                {checkmarks.map((text, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 transition-transform duration-300 ease-in-out hover:translate-x-2 cursor-default"
                  >
                    <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6">
                      <svg viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="10" fill="#5695D0" />
                        <path
                          d="M6 10l2.7 2.8L14 7.8"
                          stroke="white"
                          strokeWidth="2"
                          fill="none"
                        />
                      </svg>
                    </span>
                    <span className="text-sm sm:text-base lg:text-lg font-medium">
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── RIGHT: Form ── */}
            <div className="w-full">
              <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-7 lg:p-9 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-2xl">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2">
                  Having trouble with your printer?
                </h2>

                <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  Please provide details about the issue you are experiencing.
                  Our technical support team will contact you promptly.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className={inputClass}
                      required
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      className={inputClass}
                      required
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className={inputClass}
                      required
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1">
                      Looking For?
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Describe your issue"
                      className={inputClass}
                      required
                    />
                    {errors.message && (
                      <p className="text-red-500 text-xs mt-1">{errors.message}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full text-white py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base transition shadow-lg ${
                      loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#5695D0] hover:opacity-90 cursor-pointer"
                    }`}
                  >
                    {loading ? "Submitting..." : "Submit"}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800">
              Form Submitted Successfully!
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-5">
              Our expert will contact you shortly.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="bg-[#5695D0] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition text-sm sm:text-base font-medium w-full sm:w-auto"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PrinterSupportHero;
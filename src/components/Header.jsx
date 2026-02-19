import { useState, useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import ContactPage from "./ContactPage";
import { motion, AnimatePresence } from "framer-motion";

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [openContact, setOpenContact] = useState(false);
  const lastScrollY = useRef(0);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: "FAQ", path: "/faq" },
  ];

  /* =========================
     Scroll hide/show (desktop only)
  ========================== */
  useEffect(() => {
    if (mobileMenuOpen || openContact) {
      setShowHeader(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isDesktop = window.innerWidth >= 1024;

      if (!isDesktop || currentScrollY < 50) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY.current) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen, openContact]);

  /* =========================
     Lock body scroll
  ========================== */
  useEffect(() => {
    document.body.style.overflow =
      mobileMenuOpen || openContact ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, openContact]);

  /* =========================
     Close on ESC
  ========================== */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setOpenContact(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);
const scrollToSection = (id) => {
  const element = document.getElementById(id);
  if (!element) return;

  const offset = 82; // header height
  const targetPosition = element.getBoundingClientRect().top + window.scrollY - offset;
  const startPosition = window.scrollY;
  const distance = targetPosition - startPosition;
  const duration = 800; // in milliseconds, increase for slower scroll
  let startTime = null;

  const easeInOutQuad = (t) =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const animation = (currentTime) => {
    if (!startTime) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const run = startPosition + distance * easeInOutQuad(progress);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(animation);
  };

  requestAnimationFrame(animation);
};


  return (
    <>
      {/* ================= HEADER ================= */}
      <header
        className={`fixed left-0 w-full z-50 bg-white shadow-sm transition-transform duration-300 ${
          showHeader || mobileMenuOpen || openContact
            ? "translate-y-0"
            : "-translate-y-full"
        }`}
      >
        <div className="h-[82px] lg:h-[100px] flex items-center justify-between px-4 sm:px-6 lg:px-16 xl:px-24">

          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img
              src="/logo_l.svg"
              alt="Wheedle Technologies"
              className="h-12 lg:h-14 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
<nav className="hidden lg:flex items-center gap-6 xl:gap-8">
  {navLinks.map((link, index) => (
    <div key={link.name} className="flex items-center gap-6 xl:gap-8">
      {link.name === "Home" ? (
        <NavLink
          to={link.path}
          className={({ isActive }) =>
            `group relative h-6 overflow-hidden text-[15px] xl:text-[16px] font-medium transition-all duration-300 ${
              isActive ? "text-[#5695D0]" : "text-black/80"
            }`
          }
        >
          <span className="block translate-y-0 transition duration-300 group-hover:-translate-y-[150%]">
            {link.name}
          </span>
          <span className="absolute left-0 top-0 block translate-y-[150%] text-[#5695D0] transition duration-300 group-hover:translate-y-0">
            {link.name}
          </span>
        </NavLink>
      ) : (
        <button
          onClick={() => scrollToSection(link.name.toLowerCase())}
          className="group relative h-6 overflow-hidden text-[15px] xl:text-[16px] font-medium transition-all duration-300 text-black/80 cursor-pointer"
        >
          <span className="block translate-y-0 transition duration-300 group-hover:-translate-y-[150%]">
            {link.name}
          </span>
          <span className="absolute left-0 top-0 block translate-y-[150%] text-[#5695D0] transition duration-300 group-hover:translate-y-0">
            {link.name}
          </span>
        </button>
      )}

      {index < navLinks.length - 1 && (
        <span className="text-black/20 select-none">|</span>
      )}
    </div>
  ))}
</nav>


          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Desktop Contact Button */}
            <button
              onClick={() => setOpenContact(true)}
              className="group relative hidden lg:flex h-11 xl:h-12 w-[120px] xl:w-[130px] flex-shrink-0 items-center justify-center overflow-hidden isolate rounded-full bg-[#5695D0] text-sm font-medium text-white cursor-pointer transition-all duration-300"
            >
              <span className="absolute inset-0 overflow-hidden rounded-full">
                <span className="absolute left-0 h-full w-full translate-x-full rounded-full bg-white transition-all duration-500 group-hover:translate-x-0 group-hover:scale-150" />
              </span>
              <span className="relative z-10 transition-colors duration-300 group-hover:text-[#5695D0]">
                Contact Us
              </span>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="lg:hidden w-10 h-10 flex items-center justify-center cursor-pointer rounded-md transition-colors duration-200 hover:bg-black/5"
            >
              {mobileMenuOpen ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  stroke="#0a0f1a"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="27" height="20" stroke="#0a0f1a" viewBox="0 0 27 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5357 18.3929H25.25M1.25 9.82143H25.25M11.5357 1.25H25.25" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================= CONTACT MODAL ================= */}
      <AnimatePresence>
        {openContact && (
          <div className="fixed inset-0 z-[100]">
            <ContactPage onClose={() => setOpenContact(false)} />
          </div>
        )}
      </AnimatePresence>

      {/* ================= MOBILE MENU ================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="lg:hidden fixed top-[82px] left-0 right-0 bottom-0 z-40 bg-[#0a0f1a]/40 backdrop-blur-xl flex flex-col"
          >
            {/* Nav Links */}
            <nav className="flex flex-col pt-16 items-center flex-1 gap-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index + 0.1, duration: 0.3 }}
                  className="w-full text-center"
                >
                  <NavLink
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block w-full py-4 text-xl fonr font-medium transition-colors duration-200 ${
                        isActive ? "text-[#5695D0]" : "text-white hover:text-[#5695D0]"
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>

                  {index < navLinks.length - 1 && (
                    <div className="w-12 h-px bg-white/10 mx-auto" />
                  )}
                </motion.div>
              ))}

              {/* Mobile Contact Button */}
              {/* <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * navLinks.length + 0.1, duration: 0.3 }}
                className="mt-6"
              >
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setOpenContact(true);
                  }}
                  className="h-12 w-40 rounded-full bg-[#5695D0] text-white text-base font-medium hover:bg-[#4580bb] transition-colors duration-200 cursor-pointer"
                >
                  Contact Us
                </button>
              </motion.div> */}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Header;
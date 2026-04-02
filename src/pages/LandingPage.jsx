import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AchievementsPage from '../components/AchievementsPage'
import FaqSection from '../components/FaqSection'
import Footer from '../components/Footer'
import Header from '../components/Header'
import PrinterSupportHero from '../components/Landing'
import PrinterBrands from '../components/Printer_brands'
import PrinterRepairServices from '../components/PrinterRepairServices'
import ReasonsToChooseUs from '../components/ReasonsToChooseUs'
import RecentBlogs from '../components/RecentBlogs'
import Testimonials from '../components/Testimonials'
import ServicesSection from '../components/Services'
import CertificateSection from '../components/Certificatesection'
import Aboutus from '../components/Aboutus'
function LandingPage() {
 const location = useLocation();
  const navigate = useNavigate();

useEffect(() => {
  if (location.state?.scrollTo) {
    const targetId = location.state.scrollTo;

    const timer = setTimeout(() => {
      const element = document.getElementById(targetId);

      if (element) {
        const offset = 82;
        const targetPosition =
          element.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });
      }

      navigate(location.pathname, { replace: true, state: {} });
    }, 100);

    return () => clearTimeout(timer);
  }
}, [location, navigate]);

  return (
    <>
    <Header/>
    <PrinterSupportHero/>
    <ServicesSection/>
    <CertificateSection/>
    <PrinterBrands/>
    <RecentBlogs/>
    <AchievementsPage/>
    <ReasonsToChooseUs/> 
    <PrinterRepairServices/>
    <Aboutus/>
    <Testimonials/>
    <FaqSection/>
    <Footer colorClass="bg-white"/> 
    </>
  )
}

export default LandingPage
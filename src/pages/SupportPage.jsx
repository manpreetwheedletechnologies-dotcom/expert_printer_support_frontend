import { useState, useEffect } from "react";
import Footer from '../components/Footer'
import Header from '../components/Header'
import Testimonials from '../components/Testimonials'
import ServicesSection from '../components/Services'
import PrinterBot from '../components/PrinterBot'
import Hero_hp from "../components/Hero_hp";
import Helpform from "../components/Helpform";
function SupportPage() {
    const [botMinimized, setBotMinimized] = useState(true);
  return (
        <>
    <Header/>
    <Hero_hp title="Instant Device Setup & Connectivity Assistance. " subtitle="Comprehensive printer support solutions designed to keep your devices
running smoothly and efficiently." themeImage="/printer_su.webp"/>
    <Helpform/>
    <ServicesSection colorClass="bg-[#007DBA0D]"/>
    <Testimonials/>
    <Footer colorClass="bg-[#007DBA0D]"/>  
    <PrinterBot isMinimized={botMinimized} setIsMinimized={setBotMinimized} />
    </>
  )

}

export default SupportPage
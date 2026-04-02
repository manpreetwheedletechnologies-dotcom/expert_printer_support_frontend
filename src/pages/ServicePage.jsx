import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Hero_hp from '../components/Hero_hp'
import ServicesSection from '../components/Services'
function ServicePage() {
  return (
   <>
   <Header/>
   <Hero_hp themeImage="/printer_ser.webp" title="Protect Your Devices & Data with Confidence" subtitle="Smart protection, expert support, and seamless performance, all in one place."/>
   <ServicesSection/>
   <Footer/>
   </>
  )
}

export default ServicePage
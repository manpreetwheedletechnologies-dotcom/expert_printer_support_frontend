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

function LandingPage() {
  return (
    <>
    <Header/>
    <PrinterSupportHero/>
    <PrinterBrands/>
    <AchievementsPage/>
    <ReasonsToChooseUs/> 
    <PrinterRepairServices/>
    <RecentBlogs/>
    <Testimonials/>
    <FaqSection/>
    <Footer/> 
    </>
  )
}

export default LandingPage
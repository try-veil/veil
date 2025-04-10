import About from "@/features/home/About";
import Footer03Page from "@/features/home/Footer";
import Hero from "@/features/home/Home";
import Navbar from "@/features/home/Navbar";
import Subscribe from "@/features/home/Subscribe";
import WhyUs from "@/features/home/WhyUs";

export default function Home() {
  return (
    <div className="bg-white h-[100vh]">
      <Navbar />
      <Hero />
      <About />
      <WhyUs />
      <Subscribe />
      <Footer03Page />
    </div>
  );
}

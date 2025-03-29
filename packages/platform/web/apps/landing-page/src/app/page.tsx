import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { TemplatesSection } from "@/components/TemplatesSection";
import { ProductGridSection } from "@/components/ProductGridSection";
import { GetStartedSection } from "@/components/GetStartedSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TemplatesSection />
        <ProductGridSection />
        <GetStartedSection />
      </main>
      <Footer />
    </>
  );
}

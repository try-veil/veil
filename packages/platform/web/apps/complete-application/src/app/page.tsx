import { getServerSession } from 'next-auth';
// import { redirect } from 'next/navigation';
import { authOptions } from './api/auth/[...nextauth]/route';
// import LoginLink from '../components/LoginLink';
// import About from "@/features/home/About";
// import Footer03Page from "@/features/home/Footer";
// import Hero from "@/features/home/Home";
// import Navbar from "@/features/home/Navbar";
// import Subscribe from "@/features/home/Subscribe";
// import WhyUs from "@/features/home/WhyUs";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // if (session) {
  //   redirect('/account');
  // }
  return (
    <main>
            {/* <Navbar /> */}
            <h1 className="text-3xl font-bold underline">
      Hello world!
    </h1>
    </main>
  );
}

import veilIcon from '../assets/veil-icon.png';

export function NavBar() {
  return (
    <div className="flex items-center justify-between bg-gray-900/80 backdrop-blur-3xl p-4 border-b border-cyan-300 w-screen absolute z-10">
      <div className="text-blue-300 text-2xl font-bold flex">
        <img src={veilIcon} alt="Veil Icon" className="h-10 w-10 rounded-lg" />
        {/* <div>Veil</div> */}
        </div>
      <div className="flex justify-evenly sm:w-full lg:w-2/3 font-bold font-mono">
        <a href="#" className="text-white hover:text-cyan-500">Home</a>
        <a href="#" className="text-white hover:text-cyan-500">Pricing</a>
        <a href="#" className="text-white hover:text-cyan-500">Docs</a>
      </div>
      <div className="flex">
        <a href="#" className="text-gray-300 hover:text-white">Toggle</a>
      </div>
    </div>
  )
}
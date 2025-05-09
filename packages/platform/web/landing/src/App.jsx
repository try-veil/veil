import { useState } from 'react'
import { Outlet } from "react-router";
import { NavBar } from './components/Navbar';


function App() {

  return (
    <div className=''>
      <NavBar />
      <div className="">
        <Outlet />
      </div>
    </div>
  )
}

export default App

import { PriceComponent } from "../components/PriceComponent.jsx";

export function Pricing() {
    return (
        <div className=" w-screen h-screen bg-black overflow-y-scroll">
            <div className="flex justify-center text-white  w-screen h-2/4 relative">
                <div className="absolute  w-full h-full flex justify-center">
                    <div className=" bg-blue-500 w-96 h-96 scale-150 rotate-45 -translate-y-40 lg:-translate-y-60 rounded-3xl "></div>
                    <div className=" bg-white w-96 h-96 scale-150 rotate-45 -translate-y-40 lg:-translate-y-60 rounded-3xl "></div>
                </div>
                <div className="absolute backdrop-blur-2xl w-full h-full"></div>
                <div className=" flex text-7xl font-bold font-stretch-50% font-mono text-center z-1 pt-20 translate-y-20">
                    <div className=" text-white">Veil</div> 
                    <div className=" text-black">Pricing</div>
                </div>
            </div>
            <div className="flex justify-center">
                <PriceComponent 
                    border={true} 
                    planType={"Free Plan"} 
                    planPricePerMonth={"0"} 
                    description={"This is free plan"} 
                    featureList={["Subscription Model", "Dynamic API onboarding", "SQLite database storage"]}
                />
                <PriceComponent border={false} planType={"Business"} planPricePerMonth={"0"} description={"This is free plan"} featureList={["Subscription Model", "Dynamic API onboarding", "SQLite database storage"]}/>
                <PriceComponent border={false} planType={"Enterprise"} planPricePerMonth={"0"} description={"This is free plan"} featureList={["Subscription Model", "Dynamic API onboarding", "SQLite database storage"]}/>
            </div>
        </div>
    )
}
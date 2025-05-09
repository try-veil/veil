export function PriceComponent(props) {
    return (
        <div className={`w-96 lg:w-1/4 m-2 p-6 h-fit border-cyan-400 bg-gray-900 rounded-3xl text-white ${props.border ? "border" : ""} font-mono`}>
            <div className={`font-bold text-xl ${props.border? "text-cyan-400":""}`}>{props.planType}</div>
            <div className="my-4 flex items-end text-gray-500">
                <div className="text-4xl text-white leading-none">
                    ${props.planPricePerMonth}
                </div>
                <div className="text-base text-gray-600 ml-1">
                    /month
                </div>
            </div>
            <div role="button" onClick={e => { console.log("clicked")}} className={` my-5 w-full   text-center p-3 rounded-3xl font-mono hover:bg-blue-400 hover:duration-300 ${props.border?"bg-cyan-400 text-black":"bg-gray-800"}`}>GET STARTED</div>
            <div className=" text-gray-500">{props.description}</div>
            <div className=" w-full h-0 border border-dashed border-gray-800 my-2"></div>
            <div>
                <ul className="list-disc list-inside">
                    {props.featureList.map((feature, index) => (
                        <li key={index} className="my-2">{feature}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
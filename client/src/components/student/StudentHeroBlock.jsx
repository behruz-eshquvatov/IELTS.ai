import React from 'react'

const StudentHeroBlock = () => {
   return (
      <div className='relative'>
         <h1 className="mb-6 inline items-center justify-center text-4xl font-black uppercase leading-[1.1] tracking-tight text-slate-900 sm:mb-8 sm:text-5xl md:text-7xl">
            Estimated time to Band
            <div className="emerald-gradient-fill flex h-[50px] w-[100px] items-center justify-center overflow-hidden rounded-2xl shadow-[0_10px_40px_-10px_rgba(52,211,153,0.7)] md:h-[80px] md:w-[150px]">
               <div className="font-orbitron flex items-center text-4xl font-bold tracking-tighter text-white md:text-6xl">
                  <div className="relative flex h-[1em] w-[0.7em] justify-center">
                     7
                  </div>
                  <span className="z-10 mx-[4px] flex h-[1em] items-center text-teal-100">.</span>
                  <div className="relative flex h-[1em] w-[0.7em] justify-center">
                     0
                  </div>
               </div>
            </div>
            is
         </h1>
         <div className="absolute -bottom-4 right-2 z-0 flex items-baseline gap-4">
            <span className="bg-gradient-to-b from-slate-800 from-55% to-transparent bg-clip-text text-[11rem] font-black leading-none tracking-tighter text-transparent">
              72
            </span>
            <span className="bg-gradient-to-b from-slate-800 from-55% to-transparent bg-clip-text text-[6.5rem] font-thin leading-none tracking-wider text-transparent">
              days
            </span>
          </div>
      </div>
   )
}

export default StudentHeroBlock
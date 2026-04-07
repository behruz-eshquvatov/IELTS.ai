import { ChevronRightIcon } from 'lucide-react'
import React from 'react'

const StudentHeroBlock = () => {
   return (
      <div className="relative grid grid-cols-2 items-end gap-6 lg:flex-row lg:items-end lg:justify-between -mt-10">
         <h1 className="flex col-span-1 flex-wrap items-center gap-3 text-3xl font-black uppercase leading-[1.1] tracking-tight text-slate-900 sm:text-4xl md:text-6xl">
            <span>Estimated time to hit Band</span>
            <span className="emerald-gradient-fill flex h-[40px] w-[80px] items-center justify-center overflow-hidden rounded-2xl shadow-[0_10px_40px_-10px_rgba(52,211,153,0.7)] md:h-[60px] md:w-[130px]">
               <span className="font-orbitron flex items-center text-3xl font-bold tracking-tighter text-white md:text-5xl">
                  <span className="relative flex h-[1em] w-[0.6em] justify-center">7</span>
                  <span className="z-10 mx-[4px] flex h-[1em] items-center text-teal-100">.</span>
                  <span className="relative flex h-[1em] w-[0.6em] justify-center">0</span>
               </span>
            </span>
            <span>is</span>
            <ChevronRightIcon className='h-16 w-16 text-slate-900' />
            <ChevronRightIcon className='h-16 w-16 -ml-16 text-slate-900' />
         </h1>

         <div className="flex items-baseline self-end lg:self-auto">
            <span className="inline-block pr-[20px] bg-gradient-to-b italic from-slate-950 from-55% to-transparent bg-clip-text text-[9rem] font-black leading-[.9] tracking-tighter text-transparent sm:text-[16rem]">
               72
            </span>
            <span className="bg-gradient-to-b from-slate-950 from-55% to-transparent bg-clip-text text-[5rem] font-thin leading-none tracking-wider text-transparent sm:text-[6.5rem]">
               days
            </span>
         </div>
      </div>
   )
}

export default StudentHeroBlock

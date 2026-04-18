"use client"

import { X } from "lucide-react"

/**
 * InfoCard Component - Pop-up สำหรับแสดงข้อมูลประวัติศาสตร์
 * 
 * @param {Object} props
 * @param {string} props.title - หัวข้อ
 * @param {string|number} props.year - ปี ค.ศ. หรือ พ.ศ.
 * @param {string} props.description - รายละเอียดประวัติศาสตร์
 * @param {React.ReactNode} props.image - ภาพงานศิลปะ (optional)
 * @param {boolean} props.isOpen - สถานะเปิด/ปิด
 * @param {function} props.onClose - ฟังก์ชันปิด popup
 * @param {string} props.className - custom className (optional)
 */
export default function InfoCard({
  title = "ชื่อเหตุการณ์",
  year = "2024",
  description = "รายละเอียดเหตุการณ์ทางประวัติศาสตร์...",
  image = null,
  isOpen = true,
  onClose,
  className = "",
}) {
  if (!isOpen) return null

  return (
    <div
      className={`
        absolute z-50
        w-[340px] max-w-[90vw]
        bg-white/95 backdrop-blur-md
        rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]
        border border-white/50
        overflow-hidden
        animate-in fade-in-0 zoom-in-95 duration-300
        ${className}
      `}
    >
      {/* Header with gradient accent */}
      <div className="relative">
        {/* Decorative gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
        
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="
              absolute top-3 right-3
              w-8 h-8
              flex items-center justify-center
              rounded-full
              bg-gray-100 hover:bg-gray-200
              text-gray-500 hover:text-gray-700
              transition-colors duration-200
            "
            aria-label="ปิด"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}

        {/* Year badge */}
        <div className="pt-4 px-5">
          <span className="
            inline-flex items-center
            px-3 py-1
            text-xs font-semibold
            bg-gradient-to-r from-amber-50 to-orange-50
            text-amber-700
            rounded-full
            border border-amber-200/50
          ">
            📅 {year}
          </span>
        </div>

        {/* Title */}
        <h2 className="
          mt-2 px-5
          text-xl font-bold
          text-gray-900
          leading-tight
        ">
          {title}
        </h2>
      </div>

      {/* Content area */}
      <div className="p-5 pt-3 space-y-4">
        {/* Image Placeholder */}
        <div className="
          relative
          w-full aspect-[16/10]
          bg-gradient-to-br from-gray-100 to-gray-50
          rounded-xl
          border-2 border-dashed border-gray-200
          overflow-hidden
          flex items-center justify-center
        ">
          {image ? (
            // ถ้ามีภาพ ให้แสดงภาพ
            <div className="w-full h-full">
              {image}
            </div>
          ) : (
            // Placeholder สำหรับใส่ภาพในอนาคต
            <div className="text-center p-4">
              <div className="
                w-12 h-12 mx-auto mb-2
                rounded-full
                bg-gray-200
                flex items-center justify-center
              ">
                <svg 
                  className="w-6 h-6 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                พื้นที่สำหรับภาพงานศิลปะ
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="
          text-sm text-gray-600
          leading-relaxed
          max-h-[120px] overflow-y-auto
          pr-1
          scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent
        ">
          {description}
        </div>
      </div>

      {/* Footer decoration */}
      <div className="
        h-1
        bg-gradient-to-r from-transparent via-gray-200 to-transparent
      " />
    </div>
  )
}

/**
 * ตัวอย่างการใช้งาน:
 * 
 * <InfoCard
 *   title="สงครามโลกครั้งที่ 2"
 *   year="1939-1945"
 *   description="สงครามโลกครั้งที่สองเป็นสงครามทั่วโลกที่กินเวลาตั้งแต่ปี 1939 ถึง 1945..."
 *   image={<img src="/path/to/image.jpg" alt="WW2" className="w-full h-full object-cover" />}
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   className="top-10 left-10"
 * />
 */
import { ref } from 'vue'

export const translations = {
    en: {
        // Shared & PhotoViewer
        camera: 'Camera',
        lens: 'Lens',
        focalLength: 'Focal Length',
        aperture: 'Aperture',
        shutter: 'Shutter',
        iso: 'ISO',
        takenOn: 'Taken On',
        filename: 'Filename',
        size: 'Size',
        dimensions: 'Dimensions',
        photoReady: 'Photo ready —',
        tapToShare: 'Tap to share',
        slowConnection: 'Slow connection — still downloading…',
        
        // Public Link page
        backToGroup: 'Back to {group}',
        by: 'by',
        noPhotosYet: 'No photos yet',
        downloadStarted: 'Download Started!',
        downloadComplete: 'Download Complete!',
        supportPhotographers: 'Support the photographers who made these shots possible by tagging or following them:',
        done: 'Done',
        photographers: 'Photographers',
        photosReady: 'Your photos are ready to share.',
        doNotClose: 'Do not close until this dialog closes.',
        shareSaveNow: 'Share/Save Now',
        downloadZip: 'Download ZIP',
        cancel: 'Cancel',
        progress: 'Progress',
        filesProcessed: 'files processed',
        clear: 'Clear',
        download: 'Download',
        downloadingPhotos: 'Downloading Photos',
        sharingPhotos: 'Sharing Photos',
        photosReadyTitle: 'Photos Ready',
        
        // password
        passwordRequired: 'Password Required',
        passwordPlaceholder: 'Enter password',
        accessing: 'Accessing...',
        viewAccess: 'View Access',
        collectionBy: 'Collection by {owner}',
        viewAllPictures: 'View All Pictures',
        allPictures: 'All Pictures',
        selectedCount: '{count} {plural} selected',
        photo: 'photo',
        photos: 'photos'
    },
    th: {
        // Shared & PhotoViewer
        camera: 'กล้อง',
        lens: 'เลนส์',
        focalLength: 'ระยะโฟกัส',
        aperture: 'รูรับแสง',
        shutter: 'ความเร็วชัตเตอร์',
        iso: 'ISO',
        takenOn: 'ถ่ายเมื่อ',
        filename: 'ชื่อไฟล์',
        size: 'ขนาดไฟล์',
        dimensions: 'สัดส่วนภาพ',
        photoReady: 'ภาพพร้อมแล้ว —',
        tapToShare: 'แตะเพื่อแชร์',
        slowConnection: 'การเชื่อมต่อช้า — กำลังดาวน์โหลด…',
        
        // Public Link page
        backToGroup: 'กลับไปที่ {group}',
        by: 'โดย',
        noPhotosYet: 'ยังไม่มีรูปภาพ',
        downloadStarted: 'เริ่มดาวน์โหลดแล้ว!',
        downloadComplete: 'ดาวน์โหลดเสร็จสิ้น!',
        supportPhotographers: 'สนับสนุนช่างภาพที่ถ่ายภาพเหล่านี้ด้วยการแท็กหรือติดตามพวกเขา:',
        done: 'เสร็จสิ้น',
        photographers: 'ช่างภาพ',
        photosReady: 'รูปภาพของคุณพร้อมสำหรับการแชร์แล้ว',
        doNotClose: 'กรุณาอย่าปิดจนกว่ากล่องข้อความนี้จะปิดลง',
        shareSaveNow: 'แชร์/บันทึกทันที',
        downloadZip: 'ดาวน์โหลดไฟล์ ZIP',
        cancel: 'ยกเลิก',
        progress: 'ความคืบหน้า',
        filesProcessed: 'ไฟล์ได้รับการประมวลผลแล้ว',
        clear: 'ล้างข้อมูล',
        download: 'ดาวน์โหลด',
        downloadingPhotos: 'กำลังดาวน์โหลดรูปภาพ',
        sharingPhotos: 'กำลังแชร์รูปภาพ',
        photosReadyTitle: 'รูปภาพพร้อมแล้ว',
        
        // password
        passwordRequired: 'ต้องระบุรหัสผ่าน',
        passwordPlaceholder: 'ป้อนรหัสผ่าน',
        accessing: 'กำลังตรวจสอบ...',
        viewAccess: 'ดูข้อมูล',
        collectionBy: 'คอลเลกชันโดย {owner}',
        viewAllPictures: 'ดูรูปภาพทั้งหมด',
        allPictures: 'รูปภาพทั้งหมด',
        selectedCount: 'เลือกแล้ว {count} {plural}',
        photo: 'รูปภาพ',
        photos: 'รูปภาพ'
    }
}

export const currentLang = ref<'en' | 'th'>('en')

export const initLanguage = () => {
    if (typeof navigator !== 'undefined') {
        const lang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en'
        if (lang.toLowerCase().startsWith('th')) {
            currentLang.value = 'th'
        } else {
            currentLang.value = 'en'
        }
    }
}

export const t = (key: keyof typeof translations.en) => {
    return translations[currentLang.value][key] || translations.en[key]
}

import { registerFaceJobHandlers } from '../utils/face-jobs'

export default defineNitroPlugin(() => {
    registerFaceJobHandlers()
})

import { registerPhotoJobHandlers } from '../utils/photo-jobs'
import { startWorker } from '../utils/queue'

export default defineNitroPlugin(async () => {
    registerPhotoJobHandlers()
    startWorker()
})

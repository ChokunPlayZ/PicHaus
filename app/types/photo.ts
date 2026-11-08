export interface PhotoAlbum {
    id: string
    name: string
    description?: string | null
    eventDate?: number | null
}

export interface Photo {
    id: string
    filename: string
    originalName: string
    size: number
    createdAt: number
    uploader: {
        name: string | null
        instagram?: string | null
        avatar?: string | null
    } | null
    cameraModel?: string | null
    lens?: string | null
    focalLength?: string | null
    aperture?: string | null
    shutterSpeed?: string | null
    iso?: number | null
    dateTaken?: number | null
    blurhash?: string | null
    width?: number | null
    height?: number | null
    updatedAt?: number | null
}

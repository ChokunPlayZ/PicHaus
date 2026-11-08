import type { Photo } from './photo'

export interface Pagination {
    page: number
    limit: number
    total: number
    hasMore: boolean
}

export interface PersonSummary {
    id: string
    name: string | null
    faceCount: number
    representativeFaceId: string | null
}

export interface FaceOverlay {
    id: string
    x1: number
    y1: number
    x2: number
    y2: number
    score?: number | null
    personId?: string | null
    personName?: string | null
}

export interface PersonFace extends FaceOverlay {
    photoId: string
    albumId: string | null
    photo: Photo
}

export interface PeopleResponse {
    success: boolean
    data: PersonSummary[]
    pagination: Pagination
}

export interface PersonResponse {
    success: boolean
    data: { person: PersonSummary; faces: PersonFace[] }
    pagination: Pagination
}

export interface PhotoFacesResponse {
    success: boolean
    data: FaceOverlay[]
}

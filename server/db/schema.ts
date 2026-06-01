import {
    pgTable, pgEnum, uuid, text, boolean, integer, bigint,
    primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const roleEnum = pgEnum('Role', ['USER', 'ADMIN'])

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique(),
    passwordHash: text('passwordHash'),
    name: text('name'),
    instagram: text('instagram'),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    updatedAt: bigint('updatedAt', { mode: 'bigint' }).notNull(),
    role: roleEnum('role').default('USER').notNull(),
})

export const logos = pgTable('logos', {
    id: uuid('id').primaryKey().defaultRandom(),
    storagePath: text('storagePath').notNull(),
    originalName: text('originalName').notNull(),
    mimeType: text('mimeType').notNull(),
    uploadedById: uuid('uploadedById').references(() => users.id, { onDelete: 'set null' }),
    uploadedAt: bigint('uploadedAt', { mode: 'bigint' }).notNull(),
})

export const passkeys = pgTable('passkeys', {
    id: uuid('id').primaryKey().defaultRandom(),
    credentialId: text('credentialId').unique().notNull(),
    publicKey: text('publicKey').notNull(),
    counter: integer('counter').default(0).notNull(),
    transports: text('transports').array().default([]).notNull(),
    deviceType: text('deviceType').default('singleDevice').notNull(),
    backedUp: boolean('backedUp').default(false).notNull(),
    name: text('name').default('Passkey').notNull(),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    lastUsedAt: bigint('lastUsedAt', { mode: 'bigint' }),
    userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const albums = pgTable('albums', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    tags: text('tags').array().default([]).notNull(),
    eventDate: bigint('eventDate', { mode: 'bigint' }),
    isPublic: boolean('isPublic').default(false).notNull(),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    updatedAt: bigint('updatedAt', { mode: 'bigint' }).notNull(),
    ownerId: uuid('ownerId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // FK to photos enforced at DB level; omitted here to avoid circular reference
    coverPhotoId: uuid('coverPhotoId'),
    themePreset: text('themePreset'),
    customTheme: text('customTheme'),
    logoText: text('logoText'),
    logoImageId: uuid('logoImageId').references(() => logos.id, { onDelete: 'set null' }),
})

export const photos = pgTable('photos', {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: text('filename').notNull(),
    originalName: text('originalName').notNull(),
    storagePath: text('storagePath').notNull(),
    thumbnailStoragePath: text('thumbnailStoragePath').notNull(),
    blurhash: text('blurhash').notNull(),
    size: integer('size').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    mimeType: text('mimeType').notNull(),
    fileHash: text('fileHash').notNull(),
    cameraModel: text('cameraModel'),
    lens: text('lens'),
    focalLength: text('focalLength'),
    iso: integer('iso'),
    aperture: text('aperture'),
    shutterSpeed: text('shutterSpeed'),
    dateTaken: bigint('dateTaken', { mode: 'bigint' }),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    updatedAt: bigint('updatedAt', { mode: 'bigint' }).notNull(),
    albumId: uuid('albumId').notNull().references(() => albums.id, { onDelete: 'cascade' }),
    uploaderId: uuid('uploaderId').references(() => users.id, { onDelete: 'set null' }),
}, (t) => [
    index('photos_albumId_idx').on(t.albumId),
    index('photos_uploaderId_idx').on(t.uploaderId),
    index('photos_fileHash_idx').on(t.fileHash),
])

export const shareGroups = pgTable('share_groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    updatedAt: bigint('updatedAt', { mode: 'bigint' }).notNull(),
    ownerId: uuid('ownerId').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const shareLinks = pgTable('share_links', {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').unique().notNull(),
    type: text('type').default('view').notNull(),
    password: text('password'),
    label: text('label'),
    views: integer('views').default(0).notNull(),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    expiresAt: bigint('expiresAt', { mode: 'bigint' }),
    showMetadata: boolean('showMetadata').default(true).notNull(),
    albumId: uuid('albumId').references(() => albums.id, { onDelete: 'cascade' }),
    shareGroupId: uuid('shareGroupId').references(() => shareGroups.id, { onDelete: 'cascade' }),
})

export const albumCollaborators = pgTable('album_collaborators', {
    id: uuid('id').primaryKey().defaultRandom(),
    role: text('role').default('viewer').notNull(),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    albumId: uuid('albumId').notNull().references(() => albums.id, { onDelete: 'cascade' }),
    userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [
    uniqueIndex('album_collaborators_albumId_userId_key').on(t.albumId, t.userId),
])

export const apiTokens = pgTable('api_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    token: text('token').unique().notNull(),
    tokenPrefix: text('tokenPrefix').notNull(),
    scopes: text('scopes').array().notNull(),
    lastUsedAt: bigint('lastUsedAt', { mode: 'bigint' }),
    expiresAt: bigint('expiresAt', { mode: 'bigint' }),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const inviteTokens = pgTable('invite_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').unique().notNull(),
    type: text('type').notNull(), // 'invite' | 'password_reset'
    userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }),
    label: text('label'),
    usedAt: bigint('usedAt', { mode: 'bigint' }),
    expiresAt: bigint('expiresAt', { mode: 'bigint' }).notNull(),
    createdAt: bigint('createdAt', { mode: 'bigint' }).notNull(),
    createdBy: uuid('createdBy').references(() => users.id, { onDelete: 'set null' }),
})

// Prisma implicit M2M creates _AlbumToShareGroup with columns A (albumId) and B (shareGroupId)
export const albumToShareGroups = pgTable('_AlbumToShareGroup', {
    A: uuid('A').notNull().references(() => albums.id, { onDelete: 'cascade' }),
    B: uuid('B').notNull().references(() => shareGroups.id, { onDelete: 'cascade' }),
}, (t) => [
    primaryKey({ columns: [t.A, t.B] }),
])

// ── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
    ownedAlbums: many(albums),
    uploadedPhotos: many(photos),
    albumCollaborators: many(albumCollaborators),
    apiTokens: many(apiTokens),
    shareGroups: many(shareGroups),
    passkeys: many(passkeys),
}))

export const passkeysRelations = relations(passkeys, ({ one }) => ({
    user: one(users, { fields: [passkeys.userId], references: [users.id] }),
}))

export const albumsRelations = relations(albums, ({ one, many }) => ({
    owner: one(users, { fields: [albums.ownerId], references: [users.id] }),
    photos: many(photos, { relationName: 'albumPhotos' }),
    coverPhoto: one(photos, { fields: [albums.coverPhotoId], references: [photos.id], relationName: 'coverPhoto' }),
    collaborators: many(albumCollaborators),
    shareLinks: many(shareLinks),
    shareGroupMappings: many(albumToShareGroups),
}))

export const photosRelations = relations(photos, ({ one }) => ({
    album: one(albums, { fields: [photos.albumId], references: [albums.id], relationName: 'albumPhotos' }),
    uploader: one(users, { fields: [photos.uploaderId], references: [users.id] }),
}))

export const shareGroupsRelations = relations(shareGroups, ({ one, many }) => ({
    owner: one(users, { fields: [shareGroups.ownerId], references: [users.id] }),
    shareLinks: many(shareLinks),
    albumMappings: many(albumToShareGroups),
}))

export const shareLinksRelations = relations(shareLinks, ({ one }) => ({
    album: one(albums, { fields: [shareLinks.albumId], references: [albums.id] }),
    shareGroup: one(shareGroups, { fields: [shareLinks.shareGroupId], references: [shareGroups.id] }),
}))

export const albumCollaboratorsRelations = relations(albumCollaborators, ({ one }) => ({
    album: one(albums, { fields: [albumCollaborators.albumId], references: [albums.id] }),
    user: one(users, { fields: [albumCollaborators.userId], references: [users.id] }),
}))

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
    user: one(users, { fields: [apiTokens.userId], references: [users.id] }),
}))

export const albumToShareGroupsRelations = relations(albumToShareGroups, ({ one }) => ({
    album: one(albums, { fields: [albumToShareGroups.A], references: [albums.id] }),
    shareGroup: one(shareGroups, { fields: [albumToShareGroups.B], references: [shareGroups.id] }),
}))

export const inviteTokensRelations = relations(inviteTokens, ({ one }) => ({
    user: one(users, { fields: [inviteTokens.userId], references: [users.id] }),
    creator: one(users, { fields: [inviteTokens.createdBy], references: [users.id] }),
}))

export const logosRelations = relations(logos, ({ one }) => ({
    uploadedBy: one(users, { fields: [logos.uploadedById], references: [users.id] }),
}))

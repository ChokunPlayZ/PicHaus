export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const search = getRequestURL(event).search || ''
    return sendRedirect(event, `/api/assets/full/${id}${search}`, 308)
})
